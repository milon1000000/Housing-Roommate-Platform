import httpStatus from "http-status";
import {
  BookingStatus,
  PaymentStatus,
  RoomStatus,
} from "../../../generated/prisma/enums";
import config from "../../config";
import { getBkashIdToken } from "../../lib/bkash";
import { prisma } from "../../lib/prisma";
import { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import {
  IBookPropertyPayload,
  ICancelBookingPayload,
  IPayBookingPayload,
} from "./booking.interface";
import { IQuery } from "../../interfaces";

const bookProperty = async (
  payload: IBookPropertyPayload,
  user: RequestUser,
) => {
  const transactionResult = await prisma.$transaction(async (tx) => {
    let tenant = await tx.tenant.findUnique({
      where: { userId: user.userId },
    });
    if (!tenant) {
      const userRecord = await tx.user.findUnique({
        where: { id: user.userId },
      });
      if (
        userRecord &&
        (userRecord.role === "TENANT" || userRecord.role === "ADMIN")
      ) {
        tenant = await tx.tenant.create({
          data: {
            userId: userRecord.id,
            name: userRecord.name,
            email: userRecord.email,
          },
        });
      } else {
        throw new AppError(httpStatus.NOT_FOUND, "Tenant Profile Not Found");
      }
    }

    const property = await tx.property.findUnique({
      where: { id: payload.propertyId },
      include: { landlord: true },
    });
    if (!property || property.isDeleted) {
      throw new AppError(httpStatus.NOT_FOUND, "Property Not Found");
    }

    let totalAmount = property.rentPrice;
    const seatCount =
      payload.seatCount && payload.seatCount > 0 ? payload.seatCount : 1;

    if (payload.roomId) {
      const room = await tx.room.findUnique({
        where: { id: payload.roomId },
      });
      if (!room || room.propertyId !== property.id) {
        throw new AppError(httpStatus.NOT_FOUND, "Room Not Found");
      }
      if (room.status !== RoomStatus.AVAILABLE || room.availableSeats <= 0) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          "This Room Has No Available Seats",
        );
      }
      if (seatCount > room.availableSeats) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          `Only ${room.availableSeats} seat(s) available in this room`,
        );
      }
      totalAmount = room.rentAmount * seatCount;
    }

    const existingBooking = await tx.booking.findFirst({
      where: {
        tenantId: tenant.id,
        propertyId: property.id,
        roomId: payload.roomId || null,
        status: BookingStatus.PENDING,
      },
    });

    if (existingBooking) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "You Already Have A Pending Booking. Please Pay For That",
      );
    }

    const booking = await tx.booking.create({
      data: {
        status: BookingStatus.PENDING,
        startDate: new Date(payload.startDate),
        totalAmount,
        seatCount,
        tenantId: tenant.id,
        propertyId: property.id,
        roomId: payload.roomId || null,
      },
    });

    // শুধু পেমেন্ট রেকর্ড ইনিশিয়ালাইজ করে রাখা হলো, কোনো পেমেন্ট কল করা হয়নি
    await tx.payment.create({
      data: {
        transactionId: booking.id,
        bookingId: booking.id,
        amount: totalAmount,
        status: PaymentStatus.UNPAID,
        gateway: "bKash",
      },
    });

    // বুকিংয়ের সমস্ত ডেটা রিটার্ন করা হচ্ছে
    const createdBooking = await tx.booking.findUnique({
      where: { id: booking.id },
      include: { property: true, room: true, payment: true },
    });

    return createdBooking;
  });

  return transactionResult;
};

const payBooking = async (payload: IPayBookingPayload, user: RequestUser) => {
  const bookingId = payload.bookingId;
  const existsBooking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },
    include: {
      property: true,
      room: true,
      payment: true,
    },
  });

  if (!existsBooking) {
    throw new AppError(httpStatus.NOT_FOUND, "Booking Does Not Exist");
  }
  if (existsBooking.status !== BookingStatus.PENDING) {
    throw new AppError(httpStatus.BAD_REQUEST, "Booking Is Not Pending");
  }

  const amount = existsBooking.totalAmount.toString();

  const bkashIdToken = await getBkashIdToken();
  if (!bkashIdToken) {
    throw new AppError(httpStatus.UNAUTHORIZED, "No Bkash Access Token Found!");
  }

  const bkashCreatePaymentResponse = await fetch(
    `${config.bkash_base_url}/tokenized/checkout/create`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: bkashIdToken,
        "X-App-Key": config.bkash_app_key,
      },
      body: JSON.stringify({
        mode: "0011",
        payerReference: user.email,
        callbackURL: `${config.bkash_callback_url}/booking/booking-room/payment/callback`,
        merchantAssociationInfo: "MI05MID54RF09123456One",
        amount: amount,
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: existsBooking.id,
      }),
    },
  );

  const bkashCreatePaymentResult = await bkashCreatePaymentResponse.json();

  if (
    !bkashCreatePaymentResult.paymentID ||
    !bkashCreatePaymentResult.bkashURL
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      bkashCreatePaymentResult.statusMessage ||
        "Failed to initialize bKash payment",
    );
  }

  if (existsBooking.payment) {
    await prisma.payment.update({
      where: {
        bookingId: existsBooking.id,
      },
      data: {
        transactionId: bkashCreatePaymentResult.paymentID || existsBooking.id,
        paymentGatewayData: bkashCreatePaymentResult,
        status: PaymentStatus.UNPAID,
      },
    });
  } else {
    await prisma.payment.create({
      data: {
        transactionId: bkashCreatePaymentResult.paymentID || existsBooking.id,
        bookingId: existsBooking.id,
        amount: existsBooking.totalAmount,
        paymentGatewayData: bkashCreatePaymentResult,
        status: PaymentStatus.UNPAID,
        gateway: "bKash",
      },
    });
  }

  return {
    paymentUrl: bkashCreatePaymentResult.bkashURL,
  };
};

const bookPaymentCallback = async (query: Record<string, any>) => {
  const paymentId = (query.paymentID || query.paymentId) as string;
  const status = ((query.status as string) || "").toLowerCase();

  if (!paymentId || !status) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Payment Id or Status Is Missing",
    );
  }

  const paymentRecord = await prisma.payment.findFirst({
    where: {
      OR: [{ transactionId: paymentId }, { bookingId: paymentId }],
    },
  });

  if (!paymentRecord) {
    throw new AppError(httpStatus.NOT_FOUND, "Payment Record Not Found!");
  }

  const booking = await prisma.booking.findUnique({
    where: { id: paymentRecord.bookingId },
    include: { room: true },
  });

  if (!booking) {
    throw new AppError(httpStatus.NOT_FOUND, "Booking Not Found!");
  }

  // If status is failure or cancel, DO NOT call execute payment
  if (status !== "success") {
    await prisma.payment.update({
      where: { id: paymentRecord.id },
      data: {
        status:
          status === "cancel" ? PaymentStatus.CANCELLED : PaymentStatus.FAILED,
        paymentGatewayData: query,
      },
    });

    return {
      redirectUrl: `${config.frontend_url}/dashboard/my-bookings?status=${status}`,
    };
  }

  // When status === "success", execute payment with bKash
  const bkashIdToken = await getBkashIdToken();
  if (!bkashIdToken) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "No Bkash Access Token Found!",
    );
  }

  const executePaymentResponse = await fetch(
    `${config.bkash_base_url}/tokenized/checkout/execute`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: bkashIdToken,
        "X-App-Key": config.bkash_app_key,
      },
      body: JSON.stringify({ paymentID: paymentId }),
    },
  );

  const executePaymentResult = await executePaymentResponse.json();

  if (
    executePaymentResult.statusCode === "0000" &&
    (executePaymentResult.transactionStatus === "Completed" ||
      executePaymentResult.statusMessage === "Successful")
  ) {
    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.APPROVED },
      });

      if (booking.roomId) {
        const currentRoom =
          booking.room ||
          (await tx.room.findUnique({ where: { id: booking.roomId } }));
        if (currentRoom) {
          const newAvailableSeats = Math.max(
            0,
            currentRoom.availableSeats - booking.seatCount,
          );
          await tx.room.update({
            where: { id: booking.roomId },
            data: {
              availableSeats: newAvailableSeats,
              status:
                newAvailableSeats === 0
                  ? RoomStatus.BOOKED
                  : RoomStatus.AVAILABLE,
            },
          });
        }
      } else {
        await tx.property.update({
          where: { id: booking.propertyId },
          data: { isAvailable: false },
        });
      }

      await tx.payment.update({
        where: { id: paymentRecord.id },
        data: {
          status: PaymentStatus.PAID,
          paymentGatewayData: executePaymentResult,
        },
      });
    });

    return {
      redirectUrl: `${config.frontend_url}/dashboard/my-bookings?status=success`,
    };
  } else {
    await prisma.payment.update({
      where: { id: paymentRecord.id },
      data: {
        status: PaymentStatus.FAILED,
        paymentGatewayData: executePaymentResult,
      },
    });

    return {
      redirectUrl: `${config.frontend_url}/dashboard/my-bookings?status=failure&message=${encodeURIComponent(
        executePaymentResult.statusMessage || "Payment execution failed",
      )}`,
    };
  }
};

const cancelBooking = async (
  payload: ICancelBookingPayload,
  user: RequestUser,
) => {
  const transactionResult = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.findUnique({
      where: { userId: user.userId },
    });
    if (!tenant) {
      throw new AppError(httpStatus.NOT_FOUND, "Tenant Not Found");
    }

    const booking = await tx.booking.findUnique({
      where: { id: payload.bookingId, tenantId: tenant.id },
      include: { payment: true, room: true },
    });

    if (!booking) {
      throw new AppError(httpStatus.NOT_FOUND, "Booking Does Not Exist");
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new Error("Booking Already Cancelled");
    }

    await tx.booking.update({
      where: { id: payload.bookingId },
      data: { status: BookingStatus.CANCELLED },
    });

    if (booking.roomId) {
      if (
        booking.status === BookingStatus.APPROVED ||
        booking.payment?.status === PaymentStatus.PAID
      ) {
        const currentRoom =
          booking.room ||
          (await tx.room.findUnique({ where: { id: booking.roomId } }));
        if (currentRoom) {
          const restoredSeats = Math.min(
            currentRoom.capacity,
            currentRoom.availableSeats + booking.seatCount,
          );
          await tx.room.update({
            where: { id: booking.roomId },
            data: {
              availableSeats: restoredSeats,
              status: RoomStatus.AVAILABLE,
            },
          });
        }
      }
    } else {
      if (
        booking.status === BookingStatus.APPROVED ||
        booking.payment?.status === PaymentStatus.PAID
      ) {
        await tx.property.update({
          where: { id: booking.propertyId },
          data: { isAvailable: true },
        });
      }
    }

    if (booking.payment && booking.payment.status === PaymentStatus.PAID) {
      const paymentTime = new Date(booking.payment.updatedAt);
      const currentTime = new Date();

      const differenceInHours =
        (currentTime.getTime() - paymentTime.getTime()) / (1000 * 60 * 60);
      const isWithin24Hours = differenceInHours <= 24;

      if (isWithin24Hours) {
        const bkashIdToken = await getBkashIdToken();
        if (!bkashIdToken) {
          throw new Error("No Bkash Access Token Found!");
        }

        const gatewayData: any = booking.payment.paymentGatewayData;
        const trxID = gatewayData?.trxID;

        if (booking.payment.transactionId && trxID) {
          const refundResponse = await fetch(
            `${config.bkash_base_url}/tokenized/checkout/payment/refund`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: bkashIdToken,
                "X-App-Key": config.bkash_app_key,
              },
              body: JSON.stringify({
                paymentID: booking.payment.transactionId,
                trxID: trxID,
                amount: booking.payment.amount.toString(),
                sku: "Booking Cancellation",
                reason: "Tenant Cancelled Within 24 Hours",
              }),
            },
          );
          const refundResult = await refundResponse.json();

          await tx.payment.update({
            where: { id: booking.payment.id },
            data: {
              status: PaymentStatus.REFUNDED,
              paymentGatewayData: refundResult,
            },
          });
        }
      } else {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          "Refund time expired. You can only get a refund within 24 hours of payment.",
        );
      }
    }

    const updatedBooking = await tx.booking.findUnique({
      where: { id: payload.bookingId },
      include: { payment: true },
    });

    return updatedBooking;
  });

  return transactionResult;
};

const getMyBookings = async (query: IQuery, user: RequestUser) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ? query.sortBy : "createdAt";
  const sortOrder =
    (query.sortOrder || query.SortOrder || "desc").toLowerCase() === "asc"
      ? "asc"
      : "desc";

  const tenant = await txTenantCheck(user.userId);

  const andConditions: any[] = [{ tenantId: tenant.id }];

  if (query.status) {
    andConditions.push({ status: query.status as BookingStatus });
  }

  const bookings = await prisma.booking.findMany({
    where: { AND: andConditions },
    take: limit,
    skip,
    orderBy: { [sortBy]: sortOrder },
    include: { property: true, room: true, payment: true },
  });

  const total = await prisma.booking.count({ where: { AND: andConditions } });

  return {
    data: bookings,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const txTenantCheck = async (userId: string) => {
  let tenant = await prisma.tenant.findUnique({
    where: { userId },
  });
  if (!tenant) {
    const userRecord = await prisma.user.findUnique({ where: { id: userId } });
    if (
      userRecord &&
      (userRecord.role === "TENANT" || userRecord.role === "ADMIN")
    ) {
      tenant = await prisma.tenant.create({
        data: {
          userId: userRecord.id,
          name: userRecord.name,
          email: userRecord.email,
        },
      });
    } else {
      throw new AppError(httpStatus.NOT_FOUND, "Tenant Profile Not Found");
    }
  }
  return tenant;
};

const getAllBookings = async (query: IQuery) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ? query.sortBy : "createdAt";
  const sortOrder =
    (query.sortOrder || query.SortOrder || "desc").toLowerCase() === "asc"
      ? "asc"
      : "desc";

  const andConditions: any[] = [];

  if (query.status) {
    andConditions.push({ status: query.status as BookingStatus });
  }

  const bookings = await prisma.booking.findMany({
    where: { AND: andConditions },
    take: limit,
    skip,
    orderBy: { [sortBy]: sortOrder },
    include: { tenant: true, property: true, room: true, payment: true },
  });

  const total = await prisma.booking.count({ where: { AND: andConditions } });

  return {
    data: bookings,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const BookingServices = {
  bookProperty,
  payBooking,
  bookPaymentCallback,
  cancelBooking,
  getMyBookings,
  getAllBookings,
};

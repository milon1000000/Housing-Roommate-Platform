import httpStatus from "http-status";
import { RequestUser } from "../../middleware/checkAuth";
import { prisma } from "../../lib/prisma";
import bcrypt from "bcryptjs";
import config from "../../config";
import {
	BookingStatus,
  LandlordVerificationStatus,
  PaymentStatus,
  Role,
  RoomStatus,
} from "../../../generated/prisma/enums";
import crypto from "crypto";
import { redisClient } from "../../lib/redis";
import path from "path";
import ejs from "ejs";
import { transporter } from "../../lib/nodemailer";
import { AppError } from "../../utils/AppError";
import { IQuery } from "../../interfaces";
import { IApplyAsLandlordPayload } from "./landloard.interface";

const applyAsLandlord = async (payload: IApplyAsLandlordPayload) => {
  const isUserExists = await prisma.user.findUnique({
    where: {
      email: payload.user.email,
    },
  });

  if (isUserExists) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "User Already Exists With This Email",
    );
  }

  const expirationSeconds = 60 * 60;
  const otpKey = `landlord-application-otp:${payload.user.email}`;
  const dataKey = `landlord-application-data:${payload.user.email}`;
  const otpValue = crypto.randomInt(100000, 900000).toString();

  const randomPassword = Math.random().toString(36).slice(-8);
  const hashedPassword = await bcrypt.hash(
    randomPassword,
    Number(config.bcrypt_salt_rounds),
  );

  const temporaryData = {
    ...payload,
    password: hashedPassword,
    rawPassword: randomPassword,
  };

  await redisClient.set(otpKey, otpValue, {
    expiration: { type: "EX", value: expirationSeconds },
  });

  await redisClient.set(dataKey, JSON.stringify(temporaryData), {
    expiration: { type: "EX", value: expirationSeconds },
  });

  const templatePath = path.join(
    process.cwd(),
    "src/app/templates/registration-landlord-otp.ejs",
  );

  const templateData = {
    name: payload.user.name,
    otpValue,
    expireMinutes: expirationSeconds / 60,
  };

  const html = await ejs.renderFile(templatePath, templateData);

  await transporter.sendMail({
    from: config.email_sender,
    to: payload.user.email,
    subject: "Landlord Application - Email Verification",
    html,
  });

  return {
    message: "OTP sent to your email. Please verify to complete application.",
    email: payload.user.email,
  };
};

const verifyLandlordEmail = async (payload: { email: string; otp: string }) => {
  const email = payload.email.trim().toLowerCase();

  const otpKey = `landlord-application-otp:${email}`;
  const dataKey = `landlord-application-data:${email}`;

  const redisOtp = await redisClient.get(otpKey);
  const redisData = await redisClient.get(dataKey);

  if (!redisOtp || !redisData) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "OTP Expired Or Application Data Not Found. Please Apply Again.",
    );
  }

  if (redisOtp !== payload.otp) {
    throw new AppError(httpStatus.BAD_REQUEST, "OTP Does Not Match");
  }

  const parsedData: IApplyAsLandlordPayload & {
    password: string;
    rawPassword: string;
  } = JSON.parse(redisData);

  // Check if user already created in DB to avoid race conditions
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "User Already Exists With This Email",
    );
  }

  // Create User & Landlord in Database after email verification
  const landlordApplication = await prisma.user.create({
    data: {
      name: parsedData.user.name,
      email: parsedData.user.email,
      password: parsedData.password,
      role: Role.LANDLORD,
      emailVerified: true,
      needPasswordChange: true,
      landlord: {
        create: {
          name: parsedData.user.name,
          email: parsedData.user.email,
          contactNumber: parsedData.user.contactNumber,
          address: parsedData.landlord.address,
          nidOrPassportNumber: parsedData.landlord.nidOrPassportNumber,
        },
      },
    },
    omit: {
      password: true,
    },
    include: {
      landlord: true,
    },
  });

  // Clear Redis cache
  await redisClient.del(otpKey);
  await redisClient.del(dataKey);

  return landlordApplication;
};

const approveLandlord = async (
  payload: {
    landlordId: string;
    verificationStatus: LandlordVerificationStatus;
    rejectionReason?: string;
  },
  reviewer: RequestUser,
) => {
  const { landlordId, verificationStatus, rejectionReason } = payload;

  const existingLandlord = await prisma.landlord.findUnique({
    where: { id: landlordId },
    include: { user: true },
  });

  if (!existingLandlord) {
    throw new AppError(httpStatus.NOT_FOUND, "Landlord Application Not Found");
  }
  if (existingLandlord.isDeleted) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Landlord Application Has Been Deleted",
    );
  }
  if (!existingLandlord.user.emailVerified) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Landlord Has Not Verified Their Email Yet. Application Cannot Be Reviewed",
    );
  }
  if (
    existingLandlord.verificationStatus !== LandlordVerificationStatus.PENDING
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Landlord Application Has Already Been ${existingLandlord.verificationStatus.toLowerCase()}`,
    );
  }
  if (
    verificationStatus === LandlordVerificationStatus.REJECTED &&
    !rejectionReason
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Rejection Reason Is Required When Rejecting A Landlord Application",
    );
  }

  let randomPassword: string | undefined;

  if (verificationStatus === LandlordVerificationStatus.APPROVED) {
    randomPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(
      randomPassword,
      Number(config.bcrypt_salt_rounds),
    );

    await prisma.user.update({
      where: { id: existingLandlord.userId },
      data: { password: hashedPassword },
    });
  }

  const updatedLandlord = await prisma.landlord.update({
    where: { id: landlordId },
    data: {
      verificationStatus,
      rejectionReason:
        verificationStatus === LandlordVerificationStatus.REJECTED
          ? rejectionReason
          : null,
      reviewedBy: reviewer.userId,
      reviewedAt: new Date(),
    },
  });

  const isApproved = verificationStatus === LandlordVerificationStatus.APPROVED;

  const templatePath = path.join(
    process.cwd(),
    `src/app/templates/${
      isApproved
        ? "landlord-application-approved.ejs"
        : "landlord-application-rejected.ejs"
    }`,
  );

  const templateData = {
    name: updatedLandlord.name,
    email: updatedLandlord.email,
    password: randomPassword,
    reason: updatedLandlord.rejectionReason,
    loginUrl: `${config.frontend_url}/login`,
  };

  const html = await ejs.renderFile(templatePath, templateData);

  await transporter.sendMail({
    from: config.email_sender,
    to: updatedLandlord.email,
    subject: isApproved
      ? "Your Landlord Application Has Been Approved"
      : "Your Landlord Application Has Been Rejected",
    html,
  });

  return updatedLandlord;
};

const getAllLandlords = async (query: IQuery) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ? query.sortBy : "createdAt";
  const sortOrder = query.SortOrder ? query.SortOrder : "desc";

  const andConditions: any[] = [];

  // Searching
  if (query.searchTerm) {
    andConditions.push({
      OR: [
        {
          name: {
            contains: query.searchTerm,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: query.searchTerm,
            mode: "insensitive",
          },
        },
        {
          contactNumber: {
            contains: query.searchTerm,
            mode: "insensitive",
          },
        },
        {
          address: {
            contains: query.searchTerm,
            mode: "insensitive",
          },
        },
      ],
    });
  }

  // Filtering
  if (query.email) {
    andConditions.push({
      email: query.email,
    });
  }

  if (query.verificationStatus) {
    andConditions.push({
      verificationStatus:
        query.verificationStatus as LandlordVerificationStatus,
    });
  }

  andConditions.push({ isDeleted: false });

  const [allLandlords, totalLandlordCount] = await Promise.all([
    prisma.landlord.findMany({
      where: {
        AND: andConditions,
      },
      take: limit,
      skip: skip,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        user: {
          omit: {
            password: true,
          },
        },
        properties: {
          where: { isDeleted: false, isAvailable: true },
        },
      },
    }),
    prisma.landlord.count({
      where: {
        AND: andConditions,
      },
    }),
  ]);

  return {
    data: allLandlords,
    meta: {
      page: page,
      limit: limit,
      total: totalLandlordCount,
      totalPages: Math.ceil(totalLandlordCount / limit),
    },
  };
};

const getSingleLandlordProfile = async (landlordId: string) => {
  const landlord = await prisma.landlord.findFirst({
    where: {
      id: landlordId,
      isDeleted: false,
    },
    include: {
      user: {
        omit: {
          password: true,
        },
      },
      properties: {
        where: {
          isDeleted: false,
          isAvailable: true,
        },
        include: {
          rooms: true,
        },
      },
    },
  });

  if (!landlord) {
    throw new AppError(httpStatus.NOT_FOUND, "Landlord Profile Not Found");
  }

  return landlord;
};

const releaseRoom = async (
	bookingId: string,
	user: RequestUser,
) => {
	if (!bookingId) {
		throw new AppError(httpStatus.BAD_REQUEST, "Booking ID is required");
	}

	// 1. Verify landlord profile
	const landlord = await prisma.landlord.findUnique({
		where: { userId: user.userId },
	});

	if (!landlord) {
		throw new AppError(httpStatus.NOT_FOUND, "Landlord Profile Not Found");
	}

	// 2. Find booking with property, room, payment, and tenant
	const booking = await prisma.booking.findUnique({
		where: { id: bookingId },
		include: {
			property: true,
			room: true,
			payment: true,
			tenant: true,
		},
	});

	if (!booking) {
		throw new AppError(httpStatus.NOT_FOUND, "Booking Not Found");
	}

	// 3. Authorization: Property must belong to this landlord
	if (booking.property.landlordId !== landlord.id) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You are not authorized to release this room. This booking does not belong to your property.",
		);
	}

	// 4. Must be paid: "ei api kj thik tokhon korbe jokhon booking paid hobe"
	if (!booking.payment || booking.payment.status !== PaymentStatus.PAID) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot release room. This booking has not been paid yet.",
		);
	}

	// 5. Check if already cancelled or released
	if (booking.status === BookingStatus.CANCELLED) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"This room/booking has already been released or cancelled.",
		);
	}

	// 6. Execute atomic transaction to restore seats and update booking
	const result = await prisma.$transaction(async (tx) => {
		let updatedRoom = null;

		// If room-level booking, add back the booked seats
		if (booking.roomId) {
			const currentRoom =
				booking.room ||
				(await tx.room.findUnique({ where: { id: booking.roomId } }));

			if (currentRoom) {
				const restoredSeats = Math.min(
					currentRoom.capacity,
					currentRoom.availableSeats + booking.seatCount,
				);

				updatedRoom = await tx.room.update({
					where: { id: currentRoom.id },
					data: {
						availableSeats: restoredSeats,
						status: RoomStatus.AVAILABLE,
					},
				});
			}
		} else {
			// If full property booking, make property available again
			await tx.property.update({
				where: { id: booking.propertyId },
				data: {
					isAvailable: true,
				},
			});
		}

		// Update booking status to CANCELLED indicating lease/stay has ended
		const updatedBooking = await tx.booking.update({
			where: { id: booking.id },
			data: {
				status: BookingStatus.CANCELLED,
			},
			include: {
				room: true,
				property: true,
				tenant: true,
				payment: true,
			},
		});

		return {
			message: `Room released successfully. ${booking.seatCount} seat(s) restored to room and now available for new bookings.`,
			booking: updatedBooking,
			room: updatedRoom,
			releasedSeats: booking.seatCount,
		};
	});

	return result;
};

export const LandlordServices = {
	applyAsLandlord,
	verifyLandlordEmail,
	approveLandlord,
	getAllLandlords,
	getSingleLandlordProfile,
	releaseRoom,
};

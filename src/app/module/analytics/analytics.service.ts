import httpStatus from "http-status";
import {
  BookingStatus,
  LandlordVerificationStatus,
  PaymentStatus,
  RoomStatus,
} from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";

const getAdminAnalytics = async () => {
  // Landlords
  const totalLandlords = await prisma.landlord.count({
    where: {
      isDeleted: false,
    },
  });

  const totalPendingLandlordApplication = await prisma.landlord.count({
    where: {
      isDeleted: false,
      verificationStatus: LandlordVerificationStatus.PENDING,
    },
  });

  const totalApprovedLandlords = await prisma.landlord.count({
    where: {
      isDeleted: false,
      verificationStatus: LandlordVerificationStatus.APPROVED,
    },
  });

  const totalRejectedLandlords = await prisma.landlord.count({
    where: {
      isDeleted: false,
      verificationStatus: LandlordVerificationStatus.REJECTED,
    },
  });

  // Tenants
  const totalTenants = await prisma.tenant.count({
    where: {
      isDeleted: false,
    },
  });

  // Properties & Rooms
  const totalProperties = await prisma.property.count({
    where: {
      isDeleted: false,
    },
  });

  const totalRooms = await prisma.room.count();

  // Bookings
  const totalBookings = await prisma.booking.count();

  const totalPendingBookings = await prisma.booking.count({
    where: {
      status: BookingStatus.PENDING,
    },
  });

  const totalApprovedBookings = await prisma.booking.count({
    where: {
      status: BookingStatus.APPROVED,
    },
  });

  const totalCancelledBookings = await prisma.booking.count({
    where: {
      status: BookingStatus.CANCELLED,
    },
  });

  const totalRejectedBookings = await prisma.booking.count({
    where: {
      status: BookingStatus.REJECTED,
    },
  });

  // Payments & Revenue
  const totalRefundResult = await prisma.payment.aggregate({
    where: {
      status: PaymentStatus.REFUNDED,
    },
    _sum: {
      amount: true,
    },
  });
  const totalRefunded = totalRefundResult._sum.amount || 0;

  const totalRevenueResult = await prisma.payment.aggregate({
    where: {
      status: PaymentStatus.PAID,
    },
    _sum: {
      amount: true,
    },
  });
  const totalRevenue = (totalRevenueResult._sum.amount || 0) - totalRefunded;

  return {
    // Rental system metrics
    totalLandlords,
    totalPendingLandlordApplication,
    totalApprovedLandlords,
    totalRejectedLandlords,
    totalTenants,
    totalProperties,
    totalRooms,
    totalBookings,
    totalPendingBookings,
    totalApprovedBookings,
    totalCancelledBookings,
    totalRejectedBookings,
    totalRevenue,
    totalRefunded,

    // Healthcare system aliases for backward compatibility
    totalDoctors: totalLandlords,
    totalPendingDoctorApplication: totalPendingLandlordApplication,
    totalApprovedDoctors: totalApprovedLandlords,
    totalRejectedDoctors: totalRejectedLandlords,
    totalPatients: totalTenants,
    totalAppointments: totalBookings,
    totalCompletedAppointments: totalApprovedBookings,
    totalCancelledAppointments: totalCancelledBookings,
    totalReveneu: totalRevenue,
  };
};

const getTenantAnalytics = async (user: RequestUser) => {
  const tenant = await prisma.tenant.findUnique({
    where: { userId: user.userId },
  });
  if (!tenant) {
    throw new AppError(httpStatus.NOT_FOUND, "Tenant Profile Not Found");
  }

  const totalBookings = await prisma.booking.count({
    where: {
      tenantId: tenant.id,
    },
  });

  const pendingBookings = await prisma.booking.count({
    where: {
      tenantId: tenant.id,
      status: BookingStatus.PENDING,
    },
  });

  const approvedBookings = await prisma.booking.count({
    where: {
      tenantId: tenant.id,
      status: BookingStatus.APPROVED,
    },
  });

  const cancelledBookings = await prisma.booking.count({
    where: {
      tenantId: tenant.id,
      status: BookingStatus.CANCELLED,
    },
  });

  const rejectedBookings = await prisma.booking.count({
    where: {
      tenantId: tenant.id,
      status: BookingStatus.REJECTED,
    },
  });

  const totalAmountSpentResult = await prisma.payment.aggregate({
    where: {
      booking: {
        tenantId: tenant.id,
      },
      status: PaymentStatus.PAID,
    },
    _sum: {
      amount: true,
    },
  });
  const totalAmountSpent = totalAmountSpentResult._sum.amount || 0;

  const totalRefundedResult = await prisma.payment.aggregate({
    where: {
      booking: {
        tenantId: tenant.id,
      },
      status: PaymentStatus.REFUNDED,
    },
    _sum: {
      amount: true,
    },
  });
  const totalRefunded = totalRefundedResult._sum.amount || 0;

  return {
    // Rental system metrics
    totalBookings,
    pendingBookings,
    approvedBookings,
    cancelledBookings,
    rejectedBookings,
    totalAmountSpent,
    totalRefunded,

    // Healthcare system aliases
    totalAppointments: totalBookings,
    upcomingAppointments: pendingBookings,
    completedAppointments: approvedBookings,
    cancelledAppointments: cancelledBookings,
  };
};

const getLandlordAnalytics = async (user: RequestUser) => {
  const landlord = await prisma.landlord.findUnique({
    where: {
      userId: user.userId,
    },
  });
  if (!landlord) {
    throw new AppError(httpStatus.NOT_FOUND, "Landlord Profile Not Found");
  }

  const totalProperties = await prisma.property.count({
    where: {
      landlordId: landlord.id,
      isDeleted: false,
    },
  });

  const totalRooms = await prisma.room.count({
    where: {
      property: {
        landlordId: landlord.id,
        isDeleted: false,
      },
    },
  });

  const availableRooms = await prisma.room.count({
    where: {
      property: {
        landlordId: landlord.id,
        isDeleted: false,
      },
      status: RoomStatus.AVAILABLE,
    },
  });

  const bookedRooms = await prisma.room.count({
    where: {
      property: {
        landlordId: landlord.id,
        isDeleted: false,
      },
      status: RoomStatus.BOOKED,
    },
  });

  const totalBookings = await prisma.booking.count({
    where: {
      property: {
        landlordId: landlord.id,
      },
    },
  });

  const pendingBookings = await prisma.booking.count({
    where: {
      property: {
        landlordId: landlord.id,
      },
      status: BookingStatus.PENDING,
    },
  });

  const approvedBookings = await prisma.booking.count({
    where: {
      property: {
        landlordId: landlord.id,
      },
      status: BookingStatus.APPROVED,
    },
  });

  const cancelledBookings = await prisma.booking.count({
    where: {
      property: {
        landlordId: landlord.id,
      },
      status: BookingStatus.CANCELLED,
    },
  });

  const rejectedBookings = await prisma.booking.count({
    where: {
      property: {
        landlordId: landlord.id,
      },
      status: BookingStatus.REJECTED,
    },
  });

  const totalRefundedResult = await prisma.payment.aggregate({
    where: {
      booking: {
        property: {
          landlordId: landlord.id,
        },
      },
      status: PaymentStatus.REFUNDED,
    },
    _sum: {
      amount: true,
    },
  });
  const totalLandlordRefunded = totalRefundedResult._sum.amount || 0;

  const totalEarningsResult = await prisma.payment.aggregate({
    where: {
      booking: {
        property: {
          landlordId: landlord.id,
        },
      },
      status: PaymentStatus.PAID,
    },
    _sum: {
      amount: true,
    },
  });
  const totalLandlordEarnings =
    (totalEarningsResult._sum.amount || 0) - totalLandlordRefunded;

  return {
    // Rental system metrics
    totalProperties,
    totalRooms,
    availableRooms,
    bookedRooms,
    totalBookings,
    pendingBookings,
    approvedBookings,
    cancelledBookings,
    rejectedBookings,
    totalLandlordEarnings,
    totalLandlordRefunded,

    // Healthcare system aliases
    totalSchedule: totalProperties,
    publishedSchedule: availableRooms,
    totalAppointments: totalBookings,
    upcomingAppointments: pendingBookings,
    ongoingAppointments: pendingBookings,
    completedAppointments: approvedBookings,
    cancelledAppointments: cancelledBookings,
    toatalDoctorEarnings: totalLandlordEarnings,
    totalDoctorEarnings: totalLandlordEarnings,
    totalDoctorRefunded: totalLandlordRefunded,
  };
};

export const AnalyticsServices = {
  getAdminAnalytics,
  getTenantAnalytics,
  getLandlordAnalytics,
 
};

import httpStatus from "http-status";
import { IQuery } from "../../interfaces";
import { prisma } from "../../lib/prisma";
import { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import { PaymentWhereInput } from "../../../generated/prisma/models";
import { Role } from "../../../generated/prisma/enums";

const getMyPayments = async (query: IQuery, user: RequestUser) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ? query.sortBy : "createdAt";
  const sortOrder = query.SortOrder ? query.SortOrder : "desc";

  const tenant = await prisma.tenant.findUnique({
    where: {
      userId: user.userId,
    },
  });

  if (!tenant) {
    throw new AppError(httpStatus.NOT_FOUND, "Tenant Profile Not Found");
  }
  const andConditions: PaymentWhereInput[] = [
    {
      booking: { tenantId: tenant.id },
    },
  ];

  const payments = await prisma.payment.findMany({
    where: {
      AND: andConditions,
    },

    take: limit,
    skip: skip,
    orderBy: {
      [sortBy]: sortOrder,
    },
    include: {
      booking: {
        include: {
          property: true,
          room: true,
        },
      },
    },
  });

  const total = await prisma.payment.count({
    where: {
      AND: andConditions,
    },
  });

  return {
    data: payments,
    meta: {
      page: page,
      limit: limit,
      total: total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getAllPayments = async (query: IQuery) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ? query.sortBy : "createdAt";
  const sortOrder = query.SortOrder ? query.SortOrder : "desc";

  const andConditions: PaymentWhereInput[] = [];

  if (query.tenantEmail) {
    andConditions.push({
      booking: {
        tenant: {
          email: query.tenantEmail,
        },
      },
    });
  }

  

  const payments = await prisma.payment.findMany({
    where: {
      AND: andConditions,
    },

    take: limit,
    skip: skip,
    orderBy: {
      [sortBy]: sortOrder,
    },
    include: {
      booking: {
        include: {
          tenant: {
            select: { id: true, name: true, email: true, userId: true },
          },
          property: true,
          room: true,
        },
      },
    },
  });

  const total = await prisma.payment.count({
    where: {
      AND: andConditions,
    },
  });

  return {
    data: payments,
    meta: {
      page: page,
      limit: limit,
      total: total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getSinglePayment = async (paymentId: string, user: RequestUser) => {
  const payment = await prisma.payment.findUnique({
    where: {
      id: paymentId,
    },
    include: {
      booking: {
        include: {
          tenant: {
            select: { id: true, name: true, email: true, userId: true },
          },
          property: true,
          room: true,
        },
      },
    },
  });

  if (!payment) {
    throw new AppError(httpStatus.BAD_REQUEST, "Payment Not Found");
  }

  if (user.role === Role.TENANT) {
    if (payment.booking.tenant.userId !== user.userId) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You Are Not Allowed To View This Payment",
      );
    }
  }

  return payment;
};

export const PaymentServices = {
  getMyPayments,
  getAllPayments,
  getSinglePayment,
};

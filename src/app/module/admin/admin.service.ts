import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import {
  LandlordVerificationStatus,
  Role,
  UserStatus,
} from "../../../generated/prisma/enums";
import { Prisma } from "../../../generated/prisma/client";
import { IQuery } from "../../interfaces";
import { IBlockUnblockPayload } from "./admin.interface";

const getAllUsers = async (query: IQuery) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ? query.sortBy : "createdAt";
   const sortOrder = query.SortOrder ? query.SortOrder : "desc";


  const andConditions: Prisma.UserWhereInput[] = [];

  const searchTerm = query.searchTerm || query.searchTream;
  if (searchTerm) {
    andConditions.push({
      OR: [
        {
          name: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
      ],
    });
  }

  if (query.role) {
    andConditions.push({
      role: query.role as Role,
    });
  }

  if (query.status) {
    andConditions.push({
      status: query.status as UserStatus,
    });
  }

  if (query.isDeleted !== undefined) {
    andConditions.push({
      isDeleted: query.isDeleted === "true" || query.isDeleted === true,
    });
  } else {
    andConditions.push({ isDeleted: false });
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: {
        AND: andConditions,
      },
      take: limit,
      skip: skip,
      orderBy: {
        [sortBy]: sortOrder,
      },
      omit: {
        password: true,
      },
      include: {
        tenant: true,
        landlord: true,
      },
    }),
    prisma.user.count({
      where: {
        AND: andConditions,
      },
    }),
  ]);

  return {
    data: users,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getAllLandloard = async (query: IQuery) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ? query.sortBy : "createdAt";
  const sortOrder =
    (query.sortOrder || query.SortOrder || "desc").toLowerCase() === "asc"
      ? "asc"
      : "desc";

  const andConditions: Prisma.LandlordWhereInput[] = [];

  const searchTerm = query.searchTerm || query.searchTream;
  if (searchTerm) {
    andConditions.push({
      OR: [
        {
          name: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        {
          contactNumber: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        {
          nidOrPassportNumber: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        {
          address: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
      ],
    });
  }

  if (query.verificationStatus) {
    andConditions.push({
      verificationStatus:
        query.verificationStatus as LandlordVerificationStatus,
    });
  }

  if (query.email) {
    andConditions.push({
      email: query.email,
    });
  }

  if (query.isDeleted !== undefined) {
    andConditions.push({
      isDeleted: query.isDeleted === "true" || query.isDeleted === true,
    });
  } else {
    andConditions.push({ isDeleted: false });
  }

  const [landlords, total] = await Promise.all([
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
          where: { isDeleted: false },
          include: {
            rooms: true,
          },
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
    data: landlords,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const deleteLandlord = async (id: string) => {
  const landlord = await prisma.landlord.findFirst({
    where: {
      OR: [{ id: id }, { userId: id }],
    },
  });

  if (!landlord || landlord.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Landlord not found");
  }

  // Soft delete landlord, corresponding user, and properties
  const result = await prisma.$transaction(async (tx) => {
    // 1. Soft delete properties
    await tx.property.updateMany({
      where: { landlordId: landlord.id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        isAvailable: false,
      },
    });

    // 2. Soft delete user
    await tx.user.update({
      where: { id: landlord.userId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: UserStatus.DELETED,
      },
    });

    // 3. Soft delete landlord
    const deleted = await tx.landlord.update({
      where: { id: landlord.id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
      include: {
        user: {
          omit: { password: true },
        },
      },
    });

    return deleted;
  });

  return result;
};

const blockUnblock = async (id: string, payload?: IBlockUnblockPayload) => {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user || user.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  // If status is provided in payload, use it; otherwise toggle ACTIVE <-> BLOCKED
  let newStatus: UserStatus;
  if (payload?.status) {
    newStatus = payload.status;
  } else {
    newStatus =
      user.status === UserStatus.ACTIVE
        ? UserStatus.BLOCKED
        : UserStatus.ACTIVE;
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: {
      status: newStatus,
    },
    omit: {
      password: true,
    },
    include: {
      tenant: true,
      landlord: true,
    },
  });

  return updatedUser;
};

export const AdminServices = {
  getAllUsers,
  getAllLandloard,
  deleteLandlord,
  blockUnblock,
};

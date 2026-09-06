import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { RequestUser } from "../../middleware/checkAuth";
import { ICreateRoom, IUpdateRoom } from "./room.interface";
import { IQuery } from "../../interfaces";
import { RoomWhereInput } from "../../../generated/prisma/models";
import { RoomStatus } from "../../../generated/prisma/enums";

const createRoomIntoDB = async (payload: ICreateRoom, user: RequestUser) => {
  const property = await prisma.property.findUnique({
    where: { id: payload.propertyId },
    include: {
      landlord: true,
    },
  });

  if (!property || property.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Property not found");
  }

  if (property.landlord.userId !== user.userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not authorized to add rooms to this property",
    );
  }

  // Check if room count exceeds totalRooms of the property
  const existingRoomsCount = await prisma.room.count({
    where: { propertyId: payload.propertyId },
  });

  if (existingRoomsCount >= property.totalRooms) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot add more rooms. Maximum room limit (${property.totalRooms}) reached for this property.`,
    );
  }

  // Check duplicate roomNumber in the same property
  const isRoomExist = await prisma.room.findFirst({
    where: {
      propertyId: payload.propertyId,
      roomNumber: payload.roomNumber,
    },
  });

  if (isRoomExist) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Room number '${payload.roomNumber}' already exists in this property`,
    );
  }

  const capacity =
    payload.capacity && payload.capacity > 0 ? payload.capacity : 1;

  const room = await prisma.room.create({
    data: {
      ...payload,
      capacity,
      availableSeats: payload.availableSeats ?? capacity,
    },
    include: {
      property: {
        include: {
          landlord: {
            include: {
              user: {
                omit: { password: true },
              },
            },
          },
        },
      },
    },
  });

  return room;
};

const getRoomsByPropertyFromDB = async (
  propertyId: string,
  query: IQuery = {},
) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ? query.sortBy : "roomNumber";
  const sortOrder = query.SortOrder
    ? query.SortOrder
    : query.sortOrder
      ? query.sortOrder
      : "asc";

  const property = await prisma.property.findUnique({
    where: { id: propertyId, isDeleted: false },
  });

  if (!property) {
    throw new AppError(httpStatus.NOT_FOUND, "Property not found");
  }

  const andConditions: RoomWhereInput[] = [
    {
      propertyId: property.id,
    },
  ];

  if (query.status) {
    andConditions.push({ status: query.status as RoomStatus });
  }

  const rooms = await prisma.room.findMany({
    where: {
      AND: andConditions,
    },
    take: limit,
    skip: skip,
    orderBy: {
      [sortBy]: sortOrder,
    },
  });

  const total = await prisma.room.count({
    where: {
      AND: andConditions,
    },
  });

  return {
    data: rooms,
    meta: {
      page: page,
      limit: limit,
      total: total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getSingleRoomFromDB = async (id: string) => {
  const room = await prisma.room.findUnique({
    where: { id },
    include: {
      property: {
        include: {
          landlord: {
            omit: { email: true },
          },
        },
      },
    },
  });

  if (!room) {
    throw new AppError(httpStatus.NOT_FOUND, "Room not found");
  }

  return room;
};

const getAllRoomsFromDB = async (query: IQuery) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ? query.sortBy : "roomNumber";
  const sortOrder = query.SortOrder
    ? query.SortOrder
    : query.sortOrder
      ? query.sortOrder
      : "asc";

  const andConditions: RoomWhereInput[] = [];

  const searchTerm = query.searchTerm || query.searchTream;

  // searching
  if (searchTerm) {
    andConditions.push({
      OR: [
        {
          roomNumber: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        {
          property: {
            title: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        },
        {
          property: {
            city: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        },
        {
          property: {
            address: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        },
      ],
    });
  }

  // filtering
  if (query.status) {
    andConditions.push({
      status: query.status as RoomStatus,
    });
  }

  if (query.propertyId) {
    andConditions.push({
      propertyId: query.propertyId,
    });
  }

  if (query.city) {
    andConditions.push({
      property: {
        city: {
          contains: query.city,
          mode: "insensitive",
        },
      },
    });
  }

  if (query.minRentAmount) {
    andConditions.push({
      rentAmount: {
        gte: Number(query.minRentAmount),
      },
    });
  }

  if (query.maxRentAmount) {
    andConditions.push({
      rentAmount: {
        lte: Number(query.maxRentAmount),
      },
    });
  }

  if (query.capacity) {
    andConditions.push({
      capacity: {
        gte: Number(query.capacity),
      },
    });
  }

  if (query.availableSeats) {
    andConditions.push({
      availableSeats: {
        gte: Number(query.availableSeats),
      },
    });
  }

  andConditions.push({
    property: {
      isDeleted: false,
    },
  });

  const allRooms = await prisma.room.findMany({
    where: {
      AND: andConditions,
    },
    take: limit,
    skip: skip,
    orderBy: {
      [sortBy]: sortOrder,
    },
    include: {
      property: {
        include: {
          landlord: {
            select: {
              id: true,
              name: true,
              email: true,
              contactNumber: true,
            },
          },
        },
      },
    },
  });

  const totalRoomCount = await prisma.room.count({
    where: {
      AND: andConditions,
    },
  });

  return {
    data: allRooms,
    meta: {
      page: page,
      limit: limit,
      total: totalRoomCount,
      totalPages: Math.ceil(totalRoomCount / limit),
    },
  };
};

const updateRoomIntoDB = async (
  id: string,
  payload: IUpdateRoom,
  user: RequestUser,
) => {
  const room = await prisma.room.findUnique({
    where: { id },
    include: { property: { include: { landlord: true } } },
  });

  if (!room) {
    throw new AppError(httpStatus.NOT_FOUND, "Room not found");
  }

  if (room.property.landlord.userId !== user.userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not authorized to update this room",
    );
  }

  // If roomNumber is changing, check for duplicate in same property
  if (payload.roomNumber && payload.roomNumber !== room.roomNumber) {
    const isRoomExist = await prisma.room.findFirst({
      where: {
        propertyId: room.propertyId,
        roomNumber: payload.roomNumber,
        NOT: { id },
      },
    });

    if (isRoomExist) {
      throw new AppError(
        httpStatus.CONFLICT,
        `Room number '${payload.roomNumber}' already exists in this property`,
      );
    }
  }

  let updateData: any = { ...payload };
  if (payload.capacity !== undefined && payload.availableSeats === undefined) {
    const bookedSeats = Math.max(0, room.capacity - room.availableSeats);
    const newAvailableSeats = Math.max(0, payload.capacity - bookedSeats);
    updateData.availableSeats = newAvailableSeats;
    if (newAvailableSeats === 0) {
      updateData.status = "BOOKED";
    } else if (room.status === "BOOKED" && newAvailableSeats > 0) {
      updateData.status = "AVAILABLE";
    }
  }

  const updatedRoom = await prisma.room.update({
    where: { id },
    data: updateData,
    include: {
      property: {
        include: {
          landlord: {
            include: {
              user: {
                omit: { password: true },
              },
            },
          },
        },
      },
    },
  });

  return updatedRoom;
};

const deleteRoomFromDB = async (id: string, user: RequestUser) => {
  const room = await prisma.room.findUnique({
    where: { id },
    include: { property: { include: { landlord: true } } },
  });

  if (!room) {
    throw new AppError(httpStatus.NOT_FOUND, "Room not found");
  }

  if (room.property.landlord.userId !== user.userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not authorized to delete this room",
    );
  }

  // Check if room has active bookings
  const activeBooking = await prisma.booking.findFirst({
    where: {
      roomId: id,
      status: { in: ["PENDING", "APPROVED"] },
    },
  });

  if (activeBooking) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Cannot delete room with active or pending bookings",
    );
  }

  const deletedRoom = await prisma.room.delete({
    where: { id },
  });

  return deletedRoom;
};

export const RoomServices = {
  createRoomIntoDB,
  getRoomsByPropertyFromDB,
  getSingleRoomFromDB,
  getAllRoomsFromDB,
  updateRoomIntoDB,
  deleteRoomFromDB,
};

import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { RequestUser } from "../../middleware/checkAuth";
import { ICreateRoom, IUpdateRoom } from "./room.interface";

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

  const room = await prisma.room.create({
    data: payload,
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

const getRoomsByPropertyFromDB = async (propertyId: string) => {
  const property = await prisma.property.findUnique({
    where: { id: propertyId, isDeleted: false },
  });

  if (!property) {
    throw new AppError(httpStatus.NOT_FOUND, "Property not found");
  }

  const rooms = await prisma.room.findMany({
    where: { propertyId },
    orderBy: { roomNumber: "asc" },
  });

  return rooms;
};

const getSingleRoomFromDB = async (id: string) => {
  const room = await prisma.room.findUnique({
    where: { id },
    include: {
      property: {
        include: {
         landlord:{
          omit:{email:true}
         }
        },
      },
    },
  });

  if (!room) {
    throw new AppError(httpStatus.NOT_FOUND, "Room not found");
  }

  return room;
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

  const updatedRoom = await prisma.room.update({
    where: { id },
    data: payload,
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
  updateRoomIntoDB,
  deleteRoomFromDB,
};

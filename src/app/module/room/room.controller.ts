import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { RoomServices } from "./room.service";

const createRoom = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await RoomServices.createRoomIntoDB(req.body, user);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Room created successfully",
    data: result,
  });
});

const getRoomsByProperty = catchAsync(async (req: Request, res: Response) => {
  const propertyId = req.params.propertyId as string;
  const result = await RoomServices.getRoomsByPropertyFromDB(propertyId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Rooms retrieved successfully",
    data: result,
  });
});

const getSingleRoom = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await RoomServices.getSingleRoomFromDB(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Room retrieved successfully",
    data: result,
  });
});

const updateRoom = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const user = req.user!;
  const result = await RoomServices.updateRoomIntoDB(id, req.body, user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Room updated successfully",
    data: result,
  });
});

const deleteRoom = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const user = req.user!;
  const result = await RoomServices.deleteRoomFromDB(id, user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Room deleted successfully",
    data: null,
  });
});

export const RoomControllers = {
  createRoom,
  getRoomsByProperty,
  getSingleRoom,
  updateRoom,
  deleteRoom,
};

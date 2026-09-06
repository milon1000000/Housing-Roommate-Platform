import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { AdminServices } from "./admin.service";

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminServices.getAllUsers(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getAllLandloard = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminServices.getAllLandloard(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Landlords retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await AdminServices.deleteUser(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User deleted successfully",
    data: result,
  });
});

const blockUnblock = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await AdminServices.blockUnblock(id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `User status changed to ${result.status.toLowerCase()} successfully`,
    data: result,
  });
});

export const AdminControllers = {
  getAllUsers,
  getAllLandloard,
  deleteUser,
  blockUnblock,
};

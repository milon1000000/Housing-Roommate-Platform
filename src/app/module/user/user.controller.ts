import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { UserServices } from "./user.service";
import { sendResponse } from "../../utils/sendResponse";
import { RequestUser } from "../../middleware/checkAuth";
import { IRequestUser } from "./user.interface";

const getMe = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const result = await UserServices.getMe(user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User profile retrieved successfully",
    data: result,
  });
});

const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const file = req.file;

  let payload = req.body;
  if (payload?.data && typeof payload.data === "string") {
    try {
      payload = JSON.parse(payload.data);
    } catch {
      // ignore
    }
  }

  if (file) payload.buffer = file.buffer;

  const result = await UserServices.updateProfile(payload, user.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile updated successfully",
    data: result,
  });
});

export const UserController = {
  getMe,
  updateProfile,
};

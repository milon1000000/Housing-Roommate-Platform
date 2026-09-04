import { Request, Response } from "express";
import httpStatus from "http-status";
import { RequestUser } from "../../middleware/checkAuth";
import { catchAsync } from "../../utils/catchAsync";
import { LandlordServices } from "./landloard.service";
import { sendResponse } from "../../utils/sendResponse";

const applyAsLandlord = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body; 
  console.log(payload)

  const result = await LandlordServices.applyAsLandlord(payload);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Landlord application submitted successfully. Please check your email for OTP.",
    data: result,
  });
});

const verifyLandlordEmail = catchAsync(async (req: Request, res: Response) => {
  const result = await LandlordServices.verifyLandlordEmail(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Email verified successfully",
    data: result,
  });
});

const approveLandlord = catchAsync(async (req: Request, res: Response) => {
  const reviewer = req.user as RequestUser;
  const result = await LandlordServices.approveLandlord(req.body, reviewer);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Landlord application status updated successfully",
    data: result,
  });
});

const getAllLandlords = catchAsync(async (req: Request, res: Response) => {
  const result = await LandlordServices.getAllLandlords(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Approved landlords fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getSingleLandlordProfile = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await LandlordServices.getSingleLandlordProfile(id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Landlord profile fetched successfully",
    data: result,
  });
});

export const LandlordController = {
  applyAsLandlord,
  verifyLandlordEmail,
  approveLandlord,
  getAllLandlords,
  getSingleLandlordProfile
};
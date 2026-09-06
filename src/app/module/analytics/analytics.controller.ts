import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { AnalyticsServices } from "./analytics.service";
import { RequestUser } from "../../middleware/checkAuth";

const getAdminAnalytics = catchAsync(async (req: Request, res: Response) => {
  const result = await AnalyticsServices.getAdminAnalytics();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Admin Analytics Retrieved Successfully",
    data: result,
  });
});

const getTenantAnalytics = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const result = await AnalyticsServices.getTenantAnalytics(user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Tenant Analytics Retrieved Successfully",
    data: result,
  });
});

const getLandlordAnalytics = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const result = await AnalyticsServices.getLandlordAnalytics(user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Landlord Analytics Retrieved Successfully",
    data: result,
  });
});

export const AnalyticsControllers = {
  getAdminAnalytics,
  getTenantAnalytics,
  getLandlordAnalytics,
  
};

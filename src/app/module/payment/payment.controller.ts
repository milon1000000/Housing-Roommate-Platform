import { Request, Response } from "express";
import httpStatus from "http-status";
import { PaymentServices } from "./payment.service";
import { RequestUser } from "../../middleware/checkAuth";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";

const getMyPayments = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await PaymentServices.getMyPayments(req.query, user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "My payments retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getAllPayments = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentServices.getAllPayments(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All payments retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getSinglePayment = catchAsync(async (req: Request, res: Response) => {
  const paymentId = (req.params.paymentId || req.params.id) as string;
  const user = req.user as RequestUser;
  const result = await PaymentServices.getSinglePayment(paymentId, user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment retrieved successfully",
    data: result,
  });
});

export const PaymentController = {
  getMyPayments,
  getAllPayments,
  getSinglePayment,
};

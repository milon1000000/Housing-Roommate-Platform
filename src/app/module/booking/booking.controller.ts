import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { BookingServices } from "./booking.service";

const bookProperty = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await BookingServices.bookProperty(req.body, user);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Booking initialized successfully. Please complete payment.",
    data: result,
  });
});

const payBooking = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await BookingServices.payBooking(req.body, user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment initialization successful. Please complete payment.",
    data: result,
  });
});

const bookPaymentCallback = catchAsync(async (req: Request, res: Response) => {
  const result = await BookingServices.bookPaymentCallback(req.query);
  res.redirect(result.redirectUrl);
});

const cancelBooking = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await BookingServices.cancelBooking(req.body, user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Booking cancelled successfully",
    data: result,
  });
});

const getMyBookings = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await BookingServices.getMyBookings(req.query, user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "My bookings retrieved successfully",
    data: result,
  });
});

const getAllBookings = catchAsync(async (req: Request, res: Response) => {
  const result = await BookingServices.getAllBookings(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All bookings retrieved successfully",
    data: result,
  });
});

export const BookingControllers = {
  bookProperty,
  payBooking,
  bookPaymentCallback,
  cancelBooking,
  getMyBookings,
  getAllBookings,
};
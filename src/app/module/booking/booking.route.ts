import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { BookingControllers } from "./booking.controller";
import { BookingValidations } from "./booking.validation";

const router = Router();

router.post(
  "/booking-room",
  auth(Role.TENANT),
  validateRequest(BookingValidations.bookPropertyValidationSchema),
  BookingControllers.bookProperty,
);

router.post(
  "/pay-booking",
  auth(Role.TENANT),
  validateRequest(BookingValidations.payBookingValidationSchema),
  BookingControllers.payBooking,
);

router.post(
  "/cancel-booking",
  auth(Role.TENANT),
  validateRequest(BookingValidations.cancelBookingValidationSchema),
  BookingControllers.cancelBooking,
);

router.get(
  "/booking-room/payment/callback",
  BookingControllers.bookPaymentCallback,
);

router.get("/my-bookings", auth(Role.TENANT), BookingControllers.getMyBookings);

router.get(
  "/all-bookings",
  auth(Role.ADMIN, Role.LANDLORD),
  BookingControllers.getAllBookings,
);

export const BookingRoutes = router;

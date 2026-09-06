import { z } from "zod";
import { BookingStatus } from "../../../generated/prisma/enums";

const bookPropertyValidationSchema = z.object({
  propertyId: z.string({ message: "Property ID is required" }),
  roomId: z.string().optional(),
  startDate: z.coerce.date({ message: "Start date is required" }),
  seatCount: z.coerce
    .number()
    .int("Seat count must be an integer")
    .positive("Seat count must be at least 1")
    .optional()
    .default(1),
});

const payBookingValidationSchema = z.object({
  bookingId: z.string({ message: "Booking ID is required" }),
});

const cancelBookingValidationSchema = z.object({
  bookingId: z.string({ message: "Booking ID is required" }),
});

const updateBookingStatusValidationSchema = z.object({
  status: z.nativeEnum(BookingStatus, {
    message: "Invalid booking status",
  }),
});

export const BookingValidations = {
  bookPropertyValidationSchema,
  payBookingValidationSchema,
  cancelBookingValidationSchema,
  updateBookingStatusValidationSchema,
};

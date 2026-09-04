import { z } from "zod";

const createRoomValidationSchema = z.object({
  roomNumber: z.string({ message: "Room number is required" }),
  rentAmount: z.coerce
    .number({ message: "Rent amount is required" })
    .positive("Rent amount must be a positive number"),
  propertyId: z.string({ message: "Property ID is required" }),
  status: z.enum(["AVAILABLE", "BOOKED", "MAINTENANCE"]).optional(),
});

const updateRoomValidationSchema = z.object({
  roomNumber: z.string().optional(),
  rentAmount: z.coerce
    .number()
    .positive("Rent amount must be a positive number")
    .optional(),
  status: z.enum(["AVAILABLE", "BOOKED", "MAINTENANCE"]).optional(),
});

export const RoomValidations = {
  createRoomValidationSchema,
  updateRoomValidationSchema,
};

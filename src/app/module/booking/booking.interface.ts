import { BookingStatus } from "../../../generated/prisma/enums";

export interface IBookPropertyPayload {
  propertyId: string;
  roomId?: string;
  startDate: string | Date;
}

export interface ICancelBookingPayload {
  bookingId: string;
}

export interface IUpdateBookingStatusPayload {
  status: BookingStatus;
}

export interface IPayBookingPayload {
  bookingId: string;
}
import { RoomStatus } from "../../../generated/prisma/enums";

export interface ICreateRoom {
  roomNumber: string;
  rentAmount: number;
  capacity?: number;
  availableSeats?: number;
  propertyId: string;
  status?: RoomStatus;
}

export interface IUpdateRoom {
  roomNumber?: string;
  rentAmount?: number;
  capacity?: number;
  availableSeats?: number;
  status?: RoomStatus;
}

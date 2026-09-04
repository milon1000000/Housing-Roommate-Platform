import { RoomStatus } from "../../../generated/prisma/enums";

export interface ICreateRoom {
  roomNumber: string;
  rentAmount: number;
  propertyId: string;
  status?: RoomStatus;
}

export interface IUpdateRoom {
  roomNumber?: string;
  rentAmount?: number;
  status?: RoomStatus;
}
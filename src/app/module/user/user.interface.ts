import { Role } from "../../../generated/prisma/enums";

export interface IRequestUser {
  userId: string;
  email: string;
  name: string;
  role: Role;
}


export interface UpdateProfilePayload {
  name?: string;
  contactNumber?: string;
  address?: string;
  buffer?: Buffer;
}
import { UserStatus } from "../../../generated/prisma/enums";

export interface IBlockUnblockPayload {
  status?: UserStatus;
}

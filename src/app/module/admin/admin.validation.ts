import { z } from "zod";
import { UserStatus } from "../../../generated/prisma/enums";

const blockUnblockValidationSchema = z.object({
  status: z
    .enum([UserStatus.ACTIVE, UserStatus.BLOCKED, UserStatus.DELETED])
    .optional(),
});

export const AdminValidations = {
  blockUnblockValidationSchema,
};

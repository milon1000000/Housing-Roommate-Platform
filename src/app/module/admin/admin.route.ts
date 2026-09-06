import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { AdminControllers } from "./admin.controller";
import { AdminValidations } from "./admin.validation";

const router = Router();

// 1. Get All Users (Admin only)
router.get("/all-users", auth(Role.ADMIN), AdminControllers.getAllUsers);

router.get(
  "/all-landloard",
  auth(Role.ADMIN),
  AdminControllers.getAllLandloard,
);

router.patch(
  "/delete-user/:id",
  auth(Role.ADMIN),
  AdminControllers.deleteUser,
);

router.patch(
  "/block-unblock/:id",
  auth(Role.ADMIN),
  validateRequest(AdminValidations.blockUnblockValidationSchema),
  AdminControllers.blockUnblock,
);

export const AdminRoutes = router;

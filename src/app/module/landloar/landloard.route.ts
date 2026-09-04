import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import {
  ApplyAsLandlordZodSchema,
  ApproveLandlordZodSchema,
  VerifyLandlordEmailZodSchema,
} from "./landloard.validation";
import { LandlordController } from "./landloard.controller";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";

const router = Router();

router.post(
  "/apply-landloard",
  validateRequest(ApplyAsLandlordZodSchema),
  LandlordController.applyAsLandlord,
);

router.post(
  "/verify-email",
  validateRequest(VerifyLandlordEmailZodSchema),
  LandlordController.verifyLandlordEmail,
);

router.get("/all-landloard", LandlordController.getAllLandlords);

router.get("/:id", LandlordController.getSingleLandlordProfile);

router.patch(
  "/approve-reject",
  auth(Role.ADMIN),
  validateRequest(ApproveLandlordZodSchema),
  LandlordController.approveLandlord,
);

export const LandlordRoutes = router;

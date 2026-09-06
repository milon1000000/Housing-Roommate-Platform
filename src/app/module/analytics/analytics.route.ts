import { Router } from "express";
import { AnalyticsControllers } from "./analytics.controller";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";

const router = Router();


router.get("/admin", auth(Role.ADMIN), AnalyticsControllers.getAdminAnalytics);


router.get(
  "/tenant",
  auth(Role.TENANT),
  AnalyticsControllers.getTenantAnalytics,
);

router.get(
  "/landlord",
  auth(Role.LANDLORD),
  AnalyticsControllers.getLandlordAnalytics,
);

export const AnalyticsRoutes = router;

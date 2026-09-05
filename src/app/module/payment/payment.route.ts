import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { PaymentController } from "./payment.controller";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.get("/my-payments", auth(Role.TENANT), PaymentController.getMyPayments);

router.get(
  "/all-payments",
  auth(Role.ADMIN),
  PaymentController.getAllPayments,
);

router.get(
  "/:paymentId",
  auth(Role.TENANT, Role.ADMIN, Role.LANDLORD),
  PaymentController.getSinglePayment,
);

export const PaymentRoutes = router;

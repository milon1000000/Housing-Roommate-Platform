import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { UserController } from "./user.controller";
import { UserValidation } from "./user.validation";

const router = Router();

// Primary endpoint
router.post(
	"/send-email",
	validateRequest(UserValidation.sendEmailZodSchema),
	UserController.sendEmail,
);



export const UserRoutes = router;

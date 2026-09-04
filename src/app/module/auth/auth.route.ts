import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { AuthController } from "./auth.controller";
import { UserValidation } from "./auth.validation";
import passport from "passport";

const router = Router();

router.post(
    "/register",
    validateRequest(UserValidation.TenantRegistrationZodSchema),
    AuthController.registerTenant,
);

router.post(
    "/verify-email",
    validateRequest(UserValidation.TenantEmailVerifyZodSchema),
    AuthController.verifyTenantEmail,
);
router.post(
  "/login",
  validateRequest(UserValidation.LoginZodSchema),
  AuthController.loginUser
);

router.post("/refresh-token", AuthController.refreshToken);
router.get(
    "/google",
    passport.authenticate("google", { scope: ["profile", "email"] }),
);
router.get("/google/callback", AuthController.googleCallback);
router.post("/forgot-password", validateRequest(UserValidation.ForgotZodSchema), AuthController.forgotPassword);
router.post("/reset-password", validateRequest(UserValidation.ResetZodSchema), AuthController.resetPassword);

export const AuthRoutes = router;
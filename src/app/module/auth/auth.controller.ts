import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { AuthService } from "./auth.service";
import passport from "passport";
import config from "../../config";

const registerTenant = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;

  await AuthService.registerTenant(payload);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Registration OTP has been sent to your email. Please check your inbox.",
    data: null,
  });
});

const verifyTenantEmail = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;

  const result = await AuthService.verifyTenantEmail(payload);

  const { accessToken, refreshToken, user, tenant } = result;

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: false,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24, // 24 hour or 1 day
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Email verified successfully. Your tenant account has been created successfully.",
    data: {
      accessToken,
      refreshToken,
      user,
      tenant
    },
  });
});

const loginUser = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const result = await AuthService.loginUser(payload);
  const { accessToken, refreshToken } = result;

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: false,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24,
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User logged in successfully",
    data: {
      accessToken,
      refreshToken,
    },
  });
});



const refreshToken = catchAsync(async (req: Request, res: Response) => {
  if (!req.cookies.refreshToken) {
    throw new Error("Refresh token is missing");
  }
  const result = await AuthService.refreshToken(req.cookies.refreshToken);
  const { accessToken, refreshToken: newRefreshToken } = result;

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: false,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24,
  });
  res.cookie("refreshToken", newRefreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "New tokens generated successfully",
    data: {
      accessToken,
      refreshToken: newRefreshToken,
    },
  });
});

const googleCallback = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate(
      "google",
      { session: false },
      async (err: any, user: any, info: any) => {
        try {
          if (err) {
            return next(err);
          }
          if (!user) {
            return res.redirect(
              `${config.frontend_url}/login?error=${encodeURIComponent(
                info?.message || "Google authentication failed",
              )}`,
            );
          }

          const result = await AuthService.googleCallback(user);
          const { accessToken, refreshToken } = result;

          res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: false,
            sameSite: "none",
            maxAge: 1000 * 60 * 60 * 24,
          });
          res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: "none",
            maxAge: 1000 * 60 * 60 * 24 * 7,
          });

          return res.redirect(`${config.frontend_url}/auth/success`);
        } catch (error) {
          next(error);
        }
      },
    )(req, res, next);
  },
);

const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  await AuthService.forgotPassword(payload);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `OTP Send To Email : ${payload.email}`,
    data: null,
  });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  await AuthService.resetPassword(payload);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password Changed Successfully",
    data: null,
  });
});

export const AuthController = {
  registerTenant,
  verifyTenantEmail,
  loginUser,
  refreshToken,
  googleCallback,
  forgotPassword,
  resetPassword,
};
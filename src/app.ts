import cookieParser from "cookie-parser";
import cors from "cors";
import express, {
  type Application,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import httpStatus from "http-status";
import config from "./app/config";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { AuthRoutes } from "./app/module/auth/auth.route";
import passport from "passport";
import "./app/config/passport";
import { getBkashIdToken } from "./app/lib/bkash";
import { UserRouters } from "./app/module/user/user.route";
import { LandlordRoutes } from "./app/module/landloar/landloard.route";
import { PropertyRoutes } from "./app/module/poperty/poperty.route";
import { RoomRoutes } from "./app/module/room/room.route";
import { BookingRoutes } from "./app/module/booking/booking.route";
import { PaymentRoutes } from "./app/module/payment/payment.route";
import { AnalyticsRoutes } from "./app/module/analytics/analytics.route";
import { AdminRoutes } from "./app/module/admin/admin.route";

const app: Application = express();

app.use(
  cors({
    origin: config.frontend_url,
    credentials: true,
  }),
);

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/user", UserRouters);
app.use("/api/v1/landloard", LandlordRoutes);
app.use("/api/v1/poperty", PropertyRoutes);
app.use("/api/v1/room", RoomRoutes);
app.use("/api/v1/booking", BookingRoutes);
app.use("/api/v1/payment", PaymentRoutes);
app.use("/api/v1/analytics", AnalyticsRoutes);
app.use("/api/v1/admin", AdminRoutes);

app.get("/test", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const grantIdTokenResult = await getBkashIdToken();
    console.log(grantIdTokenResult);

    res.status(httpStatus.OK).json({
      success: true,
      message: "Welcome to Housing and Roomate Management System Backend",
      data: null,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
});

// Basic route
app.get("/", async (req: Request, res: Response) => {
  res.status(httpStatus.OK).json({
    success: true,
    message: "Welcome to Housing and Roomate Management System Backend",
  });
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;

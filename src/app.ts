import cookieParser from "cookie-parser";
import cors from "cors";
import express, {
  type Application,
  type Request,
  type Response,
} from "express";
import httpStatus from "http-status";

import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { UserRoutes } from "./app/module/user/user.route";

const app: Application = express();

// Allow all origins for this public portfolio contact API
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Portfolio routes
app.use("/api/v1/user", UserRoutes);
app.use("/api/v1/api/v1/user", UserRoutes); // Fallback if client sends double /api/v1 prefix
app.use("/api/contact", UserRoutes);

app.get("/", async (req: Request, res: Response) => {
  res.status(httpStatus.OK).json({
    success: true,
    message: "Welcome To My Portfolio Backend API",
  });
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;

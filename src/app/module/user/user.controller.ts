import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { UserService } from "./user.service";

const sendEmail = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;

	const result = await UserService.userSendEmail(payload);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Message sent successfully!",
		data: result,
	});
});

export const UserController = {
	sendEmail,
};

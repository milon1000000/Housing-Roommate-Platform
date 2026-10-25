import ejs from "ejs";
import path from "path";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError";
import { SendEmail } from "./user.interface";
import config from "../../config";
import { transporter } from "../../lib/nodemailer";

const userSendEmail = async (payload: SendEmail) => {
	const { name, message } = payload;
	const email = payload.email?.trim().toLowerCase();

	if (!name || !email || !message) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Name, email, and message are required fields",
		);
	}

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/user-send-email.ejs",
	);

	const templateData = {
		name,
		email,
		message,
		date: new Date().toLocaleString("en-US", {
			timeZone: "Asia/Dhaka",
			dateStyle: "medium",
			timeStyle: "short",
		}),
	};

	const html = await ejs.renderFile(templatePath, templateData);

	const receiverEmail = config.email_receiver || config.smtp_user || config.email_sender;

	const mailOptions = {
		from: `"${name} (Portfolio Contact)" <${config.smtp_user}>`,
		to: receiverEmail,
		replyTo: email,
		subject: `New Portfolio Message from ${name}`,
		html,
	};

	const info = await transporter.sendMail(mailOptions);
	return info;
};

export const UserService = {
	userSendEmail,
};

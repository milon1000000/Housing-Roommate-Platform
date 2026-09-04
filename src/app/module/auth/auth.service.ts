import httpStatus from "http-status";
import bcrypt from "bcryptjs";
import type { JwtPayload, SignOptions } from "jsonwebtoken";
import { Role, UserStatus } from "../../../generated/prisma/enums";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import { jwtUtils } from "../../utils/jwt";
import type {
	IForgotPasswordPayload,
	ILoginUserPayload,
	IRegisterTenantPayload,
	IResetPasswordPayload,
	IVerifyEmailPayload,
} from "./auth.interface";
import crypto from "crypto";
import { redisClient } from "../../lib/redis";
import { transporter } from "../../lib/nodemailer";
import ejs from "ejs";
import path from "path";
import { AppError } from "../../utils/AppError";

const registerTenant = async (payload: IRegisterTenantPayload) => {
	const { name, password, tenant: tenantData } = payload;

	const email = payload.email.trim().toLowerCase();

	const isUserExists = await prisma.user.findUnique({
		where: { email },
	});

	if (isUserExists) {
		throw new AppError(
			httpStatus.CONFLICT,
			"User with this email already exists",
		);
	}

	const hashedPassword = await bcrypt.hash(
		password,
		Number(config.bcrypt_salt_rounds),
	);

	const otpKey = `tenant-registration-otp:${email}`;
	const expirationSecound = 5 * 60;
	const otpValue = crypto.randomInt(100000, 900000).toString();
	await redisClient.set(otpKey, otpValue, {
		expiration: {
			type: "EX",
			value: expirationSecound,
		},
	});

	const tenantRegistrationKey = `tenant-registration-data:${email}`;
	const redisUserPayloadData = {
		name,
		email,
		password: hashedPassword,
		tenant: tenantData,
	};

	await redisClient.set(
		tenantRegistrationKey,
		JSON.stringify(redisUserPayloadData),
		{
			expiration: {
				type: "EX",
				value: expirationSecound,
			},
		},
	);

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/registration-user-otp.ejs",
	);

	const templateData = {
		name: name,
		otpValue,
		expireMinites: expirationSecound / 60,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: config.email_sender,
		to: email,
		subject: "Email Verification",
		html,
	});
};

const verifyTenantEmail = async (payload: IVerifyEmailPayload) => {
	const otp = payload.otp;
	const email = payload.email.trim().toLowerCase();

	const isUserExists = await prisma.user.findUnique({
		where: { email },
	});

	if (isUserExists?.status === "BLOCKED") {
		throw new AppError(httpStatus.FORBIDDEN, "User is Blocked");
	}
	if (isUserExists?.isDeleted || isUserExists?.status === "DELETED") {
		throw new AppError(httpStatus.FORBIDDEN, "User is Deleted");
	}
	if (isUserExists?.emailVerified) {
		throw new AppError(httpStatus.BAD_REQUEST, "User Already Verified");
	}

	const otpKey = `tenant-registration-otp:${email}`;

	const redisOTP = await redisClient.get(otpKey);
	if (!redisOTP) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid OTP");
	}
	if (redisOTP !== otp) {
		throw new AppError(httpStatus.BAD_REQUEST, "OTP Does Not Match");
	}

	await redisClient.del(otpKey);

	const tenantRegistrationKey = `tenant-registration-data:${email}`;
	const redisTenantData = await redisClient.get(tenantRegistrationKey);

	if (!redisTenantData) {
		throw new AppError(httpStatus.BAD_REQUEST, "Tenant Doesnt Exist");
	}

	const tenantPayload: IRegisterTenantPayload = JSON.parse(redisTenantData);

	const createdUser = await prisma.user.create({
		data: {
			name: tenantPayload.name,
			email: tenantPayload.email,
			password: tenantPayload.password,
			role: Role.TENANT,
			status: UserStatus.ACTIVE,
			emailVerified: true,
			tenant: {
				create: {
					name: tenantPayload.name,
					email: tenantPayload.email,
					contactNumber: tenantPayload?.tenant?.contactNumber || "",
					address: tenantPayload?.tenant?.address || "",
				},
			},
		},
		omit: { password: true },
		include: { tenant: true },
	});
	await redisClient.del(tenantRegistrationKey);

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/tenant-welcome-email.ejs",
	);

	const templateData = {
		name: createdUser.name,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: config.email_sender,
		to: email,
		subject: "Welcome To Housing & Roommate Platform",
		html,
	});

	const { tenant, ...user } = createdUser;
	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		user,
		tenant,
		accessToken,
		refreshToken,
	};
};

const loginUser = async (payload: ILoginUserPayload) => {
	const { password } = payload;
	const email = payload.email.trim().toLowerCase();

	const user = await prisma.user.findUnique({
		where: { email },
	});

	if (!user) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	if (user.status === UserStatus.BLOCKED) {
		throw new AppError(httpStatus.FORBIDDEN, "User is blocked");
	}

	if (user.isDeleted || user.status === UserStatus.DELETED) {
		throw new AppError(httpStatus.FORBIDDEN, "User is deleted");
	}

	if (user.password === null && user.googleId !== null) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"User Already Has Account Registered With Google. Try To Login With Google.",
		);
	}

	const isPasswordMatched = await bcrypt.compare(
		password,
		user.password as string,
	);

	if (!isPasswordMatched) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Invalid credentials");
	}

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		accessToken,
		refreshToken,
	};
};

const refreshToken = async (token: string) => {
	const verifiedRefreshToken = jwtUtils.verifyToken(
		token,
		config.jwt_refresh_secret,
	);

	if (!verifiedRefreshToken.success || !verifiedRefreshToken.data) {
		throw new AppError(
			httpStatus.UNAUTHORIZED,
			config.node_env === "development"
				? (verifiedRefreshToken.error as string)
				: "Invalid refresh token",
		);
	}

	const data = verifiedRefreshToken.data as JwtPayload;

	const user = await prisma.user.findUnique({
		where: { id: data.userId },
	});

	if (!user || user.isDeleted || user.status !== UserStatus.ACTIVE) {
		throw new AppError(
			httpStatus.UNAUTHORIZED,
			"User is inactive or not found",
		);
	}

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		accessToken,
		refreshToken,
	};
};

const googleCallback = async (user: {
	id: string;
	name: string;
	email: string;
	role: Role;
}) => {
	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		accessToken,
		refreshToken,
	};
};

const forgotPassword = async (payload: IForgotPasswordPayload) => {
	const { email } = payload;

	const isUserExists = await prisma.user.findUnique({
		where: {
			email,
		},
	});
	if (!isUserExists) {
		throw new AppError(httpStatus.NOT_FOUND, "User Does Not Exists!");
	}
	if (isUserExists.status === "BLOCKED") {
		throw new AppError(httpStatus.FORBIDDEN, "User is Blocked");
	}
	if (isUserExists.isDeleted || isUserExists.status === "DELETED") {
		throw new AppError(httpStatus.FORBIDDEN, "User is Deleted");
	}
	if (!isUserExists.emailVerified) {
		throw new AppError(httpStatus.BAD_REQUEST, "User Not Verified");
	}

	if (
		isUserExists.googleId &&
		!isUserExists.password &&
		isUserExists.authProvider === "GOOGLE"
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"This account was created with Google. Please sign in with Google.",
		);
	}

	const otp = crypto.randomInt(100000, 1000000).toString();
	const key = `forgot-password-otp:${isUserExists.email}`;

	const expirationSecound = 5 * 60;

	await redisClient.set(key, otp, {
		expiration: {
			type: "EX",
			value: expirationSecound,
		},
	});

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/forgot-password.ejs",
	);

	const templateData = {
		name: isUserExists.name,
		otp,
		expireMinites: expirationSecound / 60,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: config.email_sender,
		to: isUserExists.email,
		subject: "Forgot Password",
		html,
	});
};

const resetPassword = async (payload: IResetPasswordPayload) => {
	const { email, otp, newPassword } = payload;

	const isUserExists = await prisma.user.findUnique({
		where: {
			email,
		},
	});
	if (!isUserExists) {
		throw new AppError(httpStatus.NOT_FOUND, "User Does Not Exists!");
	}
	if (isUserExists.status === "BLOCKED") {
		throw new AppError(httpStatus.FORBIDDEN, "User is Blocked");
	}
	if (isUserExists.isDeleted || isUserExists.status === "DELETED") {
		throw new AppError(httpStatus.FORBIDDEN, "User is Deleted");
	}
	if (!isUserExists.emailVerified) {
		throw new AppError(httpStatus.BAD_REQUEST, "User Not Verified");
	}

	if (
		isUserExists.googleId &&
		!isUserExists.password &&
		isUserExists.authProvider === "GOOGLE"
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"This account was created with Google. Please sign in with Google.",
		);
	}
	const key = `forgot-password-otp:${isUserExists.email}`;
	const redisOTP = await redisClient.get(key);
	if (!redisOTP) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid OTP");
	}
	if (redisOTP !== otp) {
		throw new AppError(httpStatus.BAD_REQUEST, "OTP Does Not Match");
	}
	const hashedNewPassword = await bcrypt.hash(
		newPassword,
		Number(config.bcrypt_salt_rounds),
	);

	await prisma.user.update({
		where: {
			email: isUserExists.email,
		},
		data: {
			password: hashedNewPassword,
		},
	});

	await redisClient.del([key]);

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/reset-password-success.ejs",
	);

	const templateData = {
		name: isUserExists.name,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: config.email_sender,
		to: isUserExists.email,
		subject: "Password Changed",
		html,
	});
};

export const AuthService = {
	registerTenant,
	verifyTenantEmail,
	loginUser,
	refreshToken,
	googleCallback,
	forgotPassword,
	resetPassword,
};

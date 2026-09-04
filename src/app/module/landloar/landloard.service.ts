import httpStatus from "http-status";
import { RequestUser } from "../../middleware/checkAuth";
import { prisma } from "../../lib/prisma";
import bcrypt from "bcryptjs";
import config from "../../config";
import {
	LandlordVerificationStatus,
	Role,
} from "../../../generated/prisma/enums";
import crypto from "crypto";
import { redisClient } from "../../lib/redis";
import path from "path";
import ejs from "ejs";
import { transporter } from "../../lib/nodemailer";
import { AppError } from "../../utils/AppError";
import { IQuery } from "../../interfaces";
import { IApplyAsLandlordPayload } from "./landloard.interface";

const applyAsLandlord = async (payload: IApplyAsLandlordPayload) => {
	const isUserExists = await prisma.user.findUnique({
		where: {
			email: payload.user.email,
		},
	});

	if (isUserExists) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"User Already Exists With This Email",
		);
	}

	const expirationSeconds = 60 * 60;
	const otpKey = `landlord-application-otp:${payload.user.email}`;
	const dataKey = `landlord-application-data:${payload.user.email}`;
	const otpValue = crypto.randomInt(100000, 900000).toString();

	const randomPassword = Math.random().toString(36).slice(-8);
	const hashedPassword = await bcrypt.hash(
		randomPassword,
		Number(config.bcrypt_salt_rounds),
	);

	const temporaryData = {
		...payload,
		password: hashedPassword,
		rawPassword: randomPassword,
	};

	await redisClient.set(otpKey, otpValue, {
		expiration: { type: "EX", value: expirationSeconds },
	});

	await redisClient.set(dataKey, JSON.stringify(temporaryData), {
		expiration: { type: "EX", value: expirationSeconds },
	});

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/registration-landlord-otp.ejs",
	);

	const templateData = {
		name: payload.user.name,
		otpValue,
		expireMinutes: expirationSeconds / 60,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: config.email_sender,
		to: payload.user.email,
		subject: "Landlord Application - Email Verification",
		html,
	});

	return {
		message: "OTP sent to your email. Please verify to complete application.",
		email: payload.user.email,
	};
};

const verifyLandlordEmail = async (payload: { email: string; otp: string }) => {
	const email = payload.email.trim().toLowerCase();

	const otpKey = `landlord-application-otp:${email}`;
	const dataKey = `landlord-application-data:${email}`;

	const redisOtp = await redisClient.get(otpKey);
	const redisData = await redisClient.get(dataKey);

	if (!redisOtp || !redisData) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"OTP Expired Or Application Data Not Found. Please Apply Again.",
		);
	}

	if (redisOtp !== payload.otp) {
		throw new AppError(httpStatus.BAD_REQUEST, "OTP Does Not Match");
	}

	const parsedData: IApplyAsLandlordPayload & {
		password: string;
		rawPassword: string;
	} = JSON.parse(redisData);

	// Check if user already created in DB to avoid race conditions
	const existingUser = await prisma.user.findUnique({
		where: { email },
	});

	if (existingUser) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"User Already Exists With This Email",
		);
	}

	// Create User & Landlord in Database after email verification
	const landlordApplication = await prisma.user.create({
		data: {
			name: parsedData.user.name,
			email: parsedData.user.email,
			password: parsedData.password,
			role: Role.LANDLORD,
			emailVerified: true,
			needPasswordChange: true,
			landlord: {
				create: {
					name: parsedData.user.name,
					email: parsedData.user.email,
					contactNumber: parsedData.user.contactNumber,
					address: parsedData.landlord.address,
					nidOrPassportNumber: parsedData.landlord.nidOrPassportNumber,
				},
			},
		},
		omit: {
			password: true,
		},
		include: {
			landlord: true,
		},
	});

	// Clear Redis cache
	await redisClient.del(otpKey);
	await redisClient.del(dataKey);

	return landlordApplication;
};

const approveLandlord = async (
	payload: {
		landlordId: string;
		verificationStatus: LandlordVerificationStatus;
		rejectionReason?: string;
	},
	reviewer: RequestUser,
) => {
	const { landlordId, verificationStatus, rejectionReason } = payload;

	const existingLandlord = await prisma.landlord.findUnique({
		where: { id: landlordId },
		include: { user: true },
	});

	if (!existingLandlord) {
		throw new AppError(httpStatus.NOT_FOUND, "Landlord Application Not Found");
	}
	if (existingLandlord.isDeleted) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Landlord Application Has Been Deleted",
		);
	}
	if (!existingLandlord.user.emailVerified) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Landlord Has Not Verified Their Email Yet. Application Cannot Be Reviewed",
		);
	}
	if (
		existingLandlord.verificationStatus !== LandlordVerificationStatus.PENDING
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Landlord Application Has Already Been ${existingLandlord.verificationStatus.toLowerCase()}`,
		);
	}
	if (
		verificationStatus === LandlordVerificationStatus.REJECTED &&
		!rejectionReason
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Rejection Reason Is Required When Rejecting A Landlord Application",
		);
	}

	let randomPassword: string | undefined;

	if (verificationStatus === LandlordVerificationStatus.APPROVED) {
		randomPassword = Math.random().toString(36).slice(-8);
		const hashedPassword = await bcrypt.hash(
			randomPassword,
			Number(config.bcrypt_salt_rounds),
		);

		await prisma.user.update({
			where: { id: existingLandlord.userId },
			data: { password: hashedPassword },
		});
	}

	const updatedLandlord = await prisma.landlord.update({
		where: { id: landlordId },
		data: {
			verificationStatus,
			rejectionReason:
				verificationStatus === LandlordVerificationStatus.REJECTED
					? rejectionReason
					: null,
			reviewedBy: reviewer.userId,
			reviewedAt: new Date(),
		},
	});

	const isApproved = verificationStatus === LandlordVerificationStatus.APPROVED;

	const templatePath = path.join(
		process.cwd(),
		`src/app/templates/${
			isApproved
				? "landlord-application-approved.ejs"
				: "landlord-application-rejected.ejs"
		}`,
	);

	const templateData = {
		name: updatedLandlord.name,
		email: updatedLandlord.email,
		password: randomPassword,
		reason: updatedLandlord.rejectionReason,
		loginUrl: `${config.frontend_url}/login`,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: config.email_sender,
		to: updatedLandlord.email,
		subject: isApproved
			? "Your Landlord Application Has Been Approved"
			: "Your Landlord Application Has Been Rejected",
		html,
	});

	return updatedLandlord;
};

const getAllLandlords = async (query: IQuery) => {
	const limit = query.limit ? Number(query.limit) : 10;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy ? query.sortBy : "createdAt";
	const sortOrder = query.SortOrder ? query.SortOrder : "desc";

	const andConditions: any[] = [];

	// Searching
	if (query.searchTerm) {
		andConditions.push({
			OR: [
				{
					name: {
						contains: query.searchTerm,
						mode: "insensitive",
					},
				},
				{
					email: {
						contains: query.searchTerm,
						mode: "insensitive",
					},
				},
				{
					contactNumber: {
						contains: query.searchTerm,
						mode: "insensitive",
					},
				},
				{
					address: {
						contains: query.searchTerm,
						mode: "insensitive",
					},
				},
			],
		});
	}

	// Filtering
	if (query.email) {
		andConditions.push({
			email: query.email,
		});
	}

	if (query.verificationStatus) {
		andConditions.push({
			verificationStatus:
				query.verificationStatus as LandlordVerificationStatus,
		});
	}

	andConditions.push({ isDeleted: false });

	const [allLandlords, totalLandlordCount] = await Promise.all([
		prisma.landlord.findMany({
			where: {
				AND: andConditions,
			},
			take: limit,
			skip: skip,
			orderBy: {
				[sortBy]: sortOrder,
			},
			include: {
				user: {
					omit: {
						password: true,
					},
				},
				properties: {
					where: { isDeleted: false, isAvailable: true },
				},
			},
		}),
		prisma.landlord.count({
			where: {
				AND: andConditions,
			},
		}),
	]);

	return {
		data: allLandlords,
		meta: {
			page: page,
			limit: limit,
			total: totalLandlordCount,
			totalPages: Math.ceil(totalLandlordCount / limit),
		},
	};
};

const getSingleLandlordProfile = async (landlordId: string) => {
	const landlord = await prisma.landlord.findFirst({
		where: {
			id: landlordId,
			isDeleted: false,
		},
		include: {
			user: {
				omit: {
					password: true,
				},
			},
			properties: {
				where: {
					isDeleted: false,
					isAvailable: true,
				},
				include: {
					rooms: true,
				},
			},
		},
	});

	if (!landlord) {
		throw new AppError(httpStatus.NOT_FOUND, "Landlord Profile Not Found");
	}

	return landlord;
};

export const LandlordServices = {
	applyAsLandlord,
	verifyLandlordEmail,
	approveLandlord,
	getAllLandlords,
	getSingleLandlordProfile,
};

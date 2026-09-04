import z from "zod";
import { LandlordVerificationStatus } from "../../../generated/prisma/enums";

export const ApplyAsLandlordZodSchema = z.object({
	user: z.object({
		name: z.string().min(3),
		email: z.string().email(),
		contactNumber: z.string().min(10),
	}),

	landlord: z.object({
		address: z.string().optional(),

		nidOrPassportNumber: z
			.string()
			.min(5, "NID or Passport number is required"),
	}),
});

export const VerifyLandlordEmailZodSchema = z.object({
	email: z.string("Email must be a string").email("Invalid email address"),
	otp: z
		.string("OTP must be a string")
		.length(6, "OTP must be exactly 6 digits"),
});

export const ApproveLandlordZodSchema = z.object({
	landlordId: z
		.string("Landlord ID must be a string")
		.min(1, "Landlord ID is required"),

	verificationStatus: z.nativeEnum(LandlordVerificationStatus, {
		message: "Verification status is required",
	}),

	rejectionReason: z.string().optional(),
});

export const UpdateLandlordProfileZodSchema = z.object({
	address: z.string().optional(),
	bio: z.string().optional(),
	contactNumber: z.string().optional(),
});

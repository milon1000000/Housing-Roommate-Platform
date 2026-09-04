import { LandlordVerificationStatus } from "../../../generated/prisma/enums";

export interface IApplyAsLandlordPayload {
	user: {
		name: string;
		email: string;
		contactNumber: string;
	};

	landlord: {
		address?: string;
		nidOrPassportNumber: string;
	};
}

export interface IVerifyLandlordEmailPayload {
	email: string;
	otp: string;
}

export interface IApproveLandlordPayload {
	landlordId: string;
	verificationStatus: LandlordVerificationStatus;
	rejectionReason?: string;
}

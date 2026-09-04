import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import { UploadApiResponse } from "cloudinary";
import { cloudinary } from "../../lib/cloudinary";
import { UpdateProfilePayload } from "./user.interface";

const getMe = async (user: RequestUser) => {
	const isUserExists = await prisma.user.findUnique({
		where: {
			id: user.userId,
		},
		omit: {
			password: true,
		},
	});

	if (!isUserExists) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	return isUserExists;
};

const updateProfile = async (payload: UpdateProfilePayload, userId: string) => {
	const currentUser = await prisma.user.findUnique({
		where: { id: userId },
		include: { tenant: true, landlord: true },
	});

	if (!currentUser) {
		throw new Error("User not found");
	}

	let cloudinaryResult: UploadApiResponse | null = null;

	if (payload.buffer) {
		cloudinaryResult = await new Promise<UploadApiResponse>(
			(resolve, reject) => {
				cloudinary.uploader
					.upload_stream({ resource_type: "auto" }, (error, result) => {
						if (error) return reject(error);
						if (!result) return reject(new Error("Cloudinary error"));
						resolve(result);
					})
					.end(payload.buffer);
			},
		);
	}

	const currentContact =
		currentUser.role === "TENANT"
			? currentUser.tenant?.contactNumber
			: currentUser.landlord?.contactNumber;

	const currentAddress =
		currentUser.role === "TENANT"
			? currentUser.tenant?.address
			: currentUser.landlord?.address;

	const name =
		payload.name && payload.name.trim() !== ""
			? payload.name
			: currentUser.name;

	const contactNumber =
		payload.contactNumber && payload.contactNumber.trim() !== ""
			? payload.contactNumber
			: currentContact || "";

	const address =
		payload.address && payload.address.trim() !== ""
			? payload.address
			: currentAddress || "";

	const roleKey = currentUser.role === "TENANT" ? "tenant" : "landlord";

	const updatedUser = await prisma.user.update({
		where: { id: userId },
		data: {
			name,
			...(cloudinaryResult && {
				imageUrl: cloudinaryResult.secure_url,
				imagePublicId: cloudinaryResult.public_id,
			}),
			[roleKey]: {
				update: {
					name,
					contactNumber,
					address,
				},
			},
		},
		include: {
			tenant: currentUser.role === "TENANT",
			landlord: currentUser.role === "LANDLORD",
		},
		omit: { password: true },
	});

	if (payload.buffer && currentUser.imagePublicId && currentUser.imageUrl) {
		await cloudinary.uploader.destroy(currentUser.imagePublicId);
	}

	return updatedUser;
};

export const UserServices = {
	getMe,
	updateProfile,
};

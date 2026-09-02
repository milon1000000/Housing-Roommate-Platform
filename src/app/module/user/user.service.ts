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

const updateProfile = async (
  payload: UpdateProfilePayload,
  userId: string,
) => {
  const { name, contactNumber, address, buffer } = payload;

  const currentUser = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      imagePublicId: true,
      imageUrl: true,
      role: true,
    },
  });

  let cloudinaryResult: UploadApiResponse | null = null;

  if (buffer) {
    cloudinaryResult = await new Promise<UploadApiResponse>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              resource_type: "auto",
            },
            async (error, result) => {
              if (error) {
                return reject(error);
              }
              if (!result) {
                return reject(new Error("No result returned from Cloudinary"));
              }
              resolve(result);
            },
          )
          .end(buffer);
      },
    );
  }

  const userUpdateData: any = {};
  if (name !== undefined) userUpdateData.name = name;

  if (cloudinaryResult) {
    userUpdateData.imageUrl = cloudinaryResult.secure_url;
    userUpdateData.imagePublicId = cloudinaryResult.public_id;
  }

  const includeRelations: any = {};
  const profileUpdateData: any = {};
  if (name !== undefined) profileUpdateData.name = name;
  if (contactNumber !== undefined)
    profileUpdateData.contactNumber = contactNumber;
  if (address !== undefined) profileUpdateData.address = address;

  if (currentUser?.role === "TENANT") {
    includeRelations.tenant = true;
    if (Object.keys(profileUpdateData).length > 0) {
      userUpdateData.tenant = {
        update: profileUpdateData,
      };
    }
  } else if (currentUser?.role === "LANDLORD") {
    includeRelations.landlord = true;
    if (Object.keys(profileUpdateData).length > 0) {
      userUpdateData.landlord = {
        update: profileUpdateData,
      };
    }
  }

  const updateUser = await prisma.user.update({
    where: {
      id: userId,
    },
    data: userUpdateData,
    include: includeRelations,
    omit: {
      password: true,
    },
  });

  if (buffer && currentUser?.imagePublicId && currentUser.imageUrl) {
    await cloudinary.uploader.destroy(currentUser.imagePublicId);
  }

  return updateUser;
};

export const UserServices = {
  getMe,
  updateProfile,
};

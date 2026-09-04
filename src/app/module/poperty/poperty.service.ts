import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

import { Prisma } from "../../../generated/prisma/client";
import {
  LandlordVerificationStatus,
  Role,
} from "../../../generated/prisma/enums";
import { ICreateProperty, IUpdateProperty } from "./poperty.interface";
import { IQuery } from "../../interfaces";
import { RequestUser } from "../../middleware/checkAuth";
import { UploadApiResponse } from "cloudinary";
import { cloudinary } from "../../lib/cloudinary";

const uploadImagesToCloudinary = async (files: Express.Multer.File[]) => {
  return Promise.all(
    files.map((file) => {
      return new Promise<UploadApiResponse>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              resource_type: "auto",
              folder: "properties",
            },
            (error, result) => {
              if (error) {
                return reject(error);
              }
              if (!result) {
                return reject(new Error("No result returned from Cloudinary"));
              }
              resolve(result);
            },
          )
          .end(file?.buffer);
      });
    }),
  );
};

const createPropertyIntoDB = async (
  payload: ICreateProperty,
  userId: string,
  imageFiles: Express.Multer.File[],
) => {
  let landlord = await prisma.landlord.findUnique({
    where: { userId },
  });

  if (!landlord) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user && (user.role === Role.LANDLORD || user.role === Role.ADMIN)) {
      landlord = await prisma.landlord.create({
        data: {
          userId: user.id,
          name: user.name,
          email: user.email,
          nidOrPassportNumber: `NID-${Date.now()}`,
          verificationStatus: LandlordVerificationStatus.APPROVED,
        },
      });
    }
  }

  if (!landlord || landlord.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Landlord profile not found");
  }

  if (!imageFiles || imageFiles.length === 0) {
    throw new AppError(httpStatus.BAD_REQUEST, "At least 1 image is required");
  }

  const imageUploadResults = await uploadImagesToCloudinary(imageFiles);

  const imageUrl = imageUploadResults.map((file) => file.secure_url);
  const imagePublicId = imageUploadResults.map((file) => file.public_id);

  const property = await prisma.property.create({
    data: {
      ...payload,
      imageUrl,
      imagePublicId,
      landlordId: landlord.id,
    },
    include: {
      rooms: true,
    },
  });

  return property;
};

const getAllPropertiesFromDB = async (query: IQuery) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ? query.sortBy : "createdAt";
  const sortOrder =
    (query.sortOrder || query.SortOrder || "desc").toLowerCase() === "asc"
      ? "asc"
      : "desc";

  const andConditions: Prisma.PropertyWhereInput[] = [{ isDeleted: false }];

  // Searching
  if (query.searchTerm) {
    andConditions.push({
      OR: [
        { title: { contains: query.searchTerm, mode: "insensitive" } },
        { description: { contains: query.searchTerm, mode: "insensitive" } },
        { address: { contains: query.searchTerm, mode: "insensitive" } },
        { city: { contains: query.searchTerm, mode: "insensitive" } },
      ],
    });
  }

  // Filtering by city
  if (query.city) {
    andConditions.push({
      city: { equals: query.city, mode: "insensitive" },
    });
  }

  // Filtering by availability
  if (query.isAvailable !== undefined) {
    andConditions.push({
      isAvailable: query.isAvailable === "true" || query.isAvailable === true,
    });
  }

  // Filtering by totalRooms
  if (query.totalRooms) {
    andConditions.push({
      totalRooms: { equals: Number(query.totalRooms) },
    });
  }

  // Filtering by amenities
  if (query.amenities) {
    const amenitiesList = Array.isArray(query.amenities)
      ? (query.amenities as string[])
      : [query.amenities as string];
    andConditions.push({
      amenities: { hasSome: amenitiesList },
    });
  }

  // Price range filtering
  if (query.minPrice || query.maxPrice) {
    andConditions.push({
      rentPrice: {
        gte: query.minPrice ? Number(query.minPrice) : undefined,
        lte: query.maxPrice ? Number(query.maxPrice) : undefined,
      },
    });
  }

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where: {
        AND: andConditions,
      },
      take: limit,
      skip: skip,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        landlord: {
          include: {
            user: {
              omit: { password: true },
            },
          },
        },
        rooms: true,
      },
    }),
    prisma.property.count({
      where: {
        AND: andConditions,
      },
    }),
  ]);

  return {
    data: properties,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getMyPropertiesFromDB = async (userId: string) => {
  let landlord = await prisma.landlord.findUnique({
    where: { userId },
  });

  if (!landlord) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user && (user.role === Role.LANDLORD || user.role === Role.ADMIN)) {
      landlord = await prisma.landlord.create({
        data: {
          userId: user.id,
          name: user.name,
          email: user.email,
          nidOrPassportNumber: `NID-${Date.now()}`,
          verificationStatus: LandlordVerificationStatus.APPROVED,
        },
      });
    }
  }

  if (!landlord || landlord.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Landlord profile not found");
  }

  const properties = await prisma.property.findMany({
    where: {
      landlordId: landlord.id,
      isDeleted: false,
    },
    include: {
      rooms: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return properties;
};

const getSinglePropertyFromDB = async (id: string) => {
  const property = await prisma.property.findFirst({
    where: {
      id,
      isDeleted: false,
    },
    include: {
      landlord: {
        include: {
          user: {
            omit: { password: true },
          },
        },
      },
      rooms: true,
      utilityBills: true,
    },
  });

  if (!property) {
    throw new AppError(httpStatus.NOT_FOUND, "Property not found");
  }

  return property;
};

const updatePropertyIntoDB = async (
  id: string,
  userOrUserId: RequestUser | string,
  payload: IUpdateProperty,
  imageFiles?: Express.Multer.File[],
) => {
  const property = await prisma.property.findUnique({
    where: { id },
    include: { landlord: true },
  });

  if (!property || property.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Property not found");
  }

  const userId =
    typeof userOrUserId === "string" ? userOrUserId : userOrUserId.userId;
  const isAuthorized =
    typeof userOrUserId === "string"
      ? property.landlord.userId === userId
      : userOrUserId.role === "ADMIN" || property.landlord.userId === userId;

  if (!isAuthorized) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not authorized to update this property",
    );
  }

  let imageUrl = property.imageUrl;
  let imagePublicId = property.imagePublicId;

  // If new image files are uploaded, delete previous images from Cloudinary and upload new ones
  if (imageFiles && imageFiles.length > 0) {
    // 1. Delete previous images from Cloudinary
    if (property.imagePublicId && property.imagePublicId.length > 0) {
      await Promise.all(
        property.imagePublicId.map(async (publicId) => {
          try {
            await cloudinary.uploader.destroy(publicId);
          } catch (error) {
            console.error(
              `Failed to delete Cloudinary image: ${publicId}`,
              error,
            );
          }
        }),
      );
    }

    // 2. Upload new images to Cloudinary
    const imageUploadResults = await uploadImagesToCloudinary(imageFiles);
    imageUrl = imageUploadResults.map((file) => file.secure_url);
    imagePublicId = imageUploadResults.map((file) => file.public_id);
  }

  const updatedProperty = await prisma.property.update({
    where: { id },
    data: {
      ...payload,
      imageUrl,
      imagePublicId,
    },
    include: {
      rooms: true,
    },
  });

  return updatedProperty;
};

const deletePropertyFromDB = async (id: string, user: RequestUser) => {
  const property = await prisma.property.findUnique({
    where: { id },
    include: { landlord: true },
  });

  if (!property || property.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Property not found");
  }

  if (user.role !== "ADMIN" && property.landlord.userId !== user.userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not authorized to delete this property",
    );
  }

  const deletedProperty = await prisma.property.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      isAvailable: false,
    },
  });

  return deletedProperty;
};

export const PropertyServices = {
  createPropertyIntoDB,
  getAllPropertiesFromDB,
  getMyPropertiesFromDB,
  getSinglePropertyFromDB,
  updatePropertyIntoDB,
  deletePropertyFromDB,
};

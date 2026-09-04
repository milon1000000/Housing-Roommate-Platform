import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { PropertyServices } from "./poperty.service";
import { AppError } from "../../utils/AppError";

const createProperty = catchAsync(async (req: Request, res: Response) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const imageFiles = files?.images;

  if (!imageFiles || imageFiles.length === 0) {
    throw new AppError(httpStatus.BAD_REQUEST, "At least 1 image is required");
  }

  if (imageFiles.length > 5) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "You can upload a maximum of 5 images",
    );
  }

  let payload = req.body;
  if (payload?.data && typeof payload.data === "string") {
    try {
      payload = JSON.parse(payload.data);
    } catch {
      // already parsed or handled
    }
  }
  const user = req.user!;

  const result = await PropertyServices.createPropertyIntoDB(
    payload,
    user.userId,
    imageFiles,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Property created successfully",
    data: result,
  });
});

const getAllProperties = catchAsync(async (req: Request, res: Response) => {
  const result = await PropertyServices.getAllPropertiesFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Properties retrieved successfully",
    data: result,
  });
});

const getMyProperties = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await PropertyServices.getMyPropertiesFromDB(user.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "My properties retrieved successfully",
    data: result,
  });
});

const getSingleProperty = catchAsync(async (req: Request, res: Response) => {
  const result = await PropertyServices.getSinglePropertyFromDB(
    req.params.id as string,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Property retrieved successfully",
    data: result,
  });
});

const updateProperty = catchAsync(async (req: Request, res: Response) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const imageFiles = files?.images;
  const user = req.user!;
  let payload = req.body;
  if (payload?.data && typeof payload.data === "string") {
    try {
      payload = JSON.parse(payload.data);
    } catch {
      // already parsed or handled
    }
  }

  const result = await PropertyServices.updatePropertyIntoDB(
    req.params.id as string,
    user,
    payload,
    imageFiles,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Property updated successfully",
    data: result,
  });
});

const deleteProperty = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;

  await PropertyServices.deletePropertyFromDB(
    req.params.id as string,
    user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Property deleted successfully",
    data: null,
  });
});

export const PropertyControllers = {
  createProperty,
  getAllProperties,
  getMyProperties,
  getSingleProperty,
  updateProperty,
  deleteProperty,
};

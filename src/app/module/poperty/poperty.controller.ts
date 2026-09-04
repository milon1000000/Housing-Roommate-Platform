
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { PropertyServices } from "./poperty.service";
import { Request, Response } from "express";
import { sendResponse } from "../../utils/sendResponse";

const createProperty = catchAsync(async (req: Request, res: Response) => {
//   const result = await PropertyServices.createPropertyIntoDB(req.body, req.user.userId as string);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Property created successfully",
    data: null,
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
//   const result = await PropertyServices.getMyPropertiesFromDB(req.user.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "My properties retrieved successfully",
    data: null,
  });
});

const getSingleProperty = catchAsync(async (req: Request, res: Response) => {
//   const result = await PropertyServices.getSinglePropertyFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Property retrieved successfully",
    data: null,
  });
});

const updateProperty = catchAsync(async (req: Request, res: Response) => {
//   const result = await PropertyServices.updatePropertyIntoDB(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Property updated successfully",
    data: null,
  });
});

const deleteProperty = catchAsync(async (req: Request, res: Response) => {
//   const result = await PropertyServices.deletePropertyFromDB(req.params.id);
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
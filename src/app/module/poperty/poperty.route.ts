import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { PropertyControllers } from "./poperty.controller";
import { PropertyValidations } from "./poperty.validation";
import { upload } from "../../lib/multer";

const router = Router();



router.post(
  "/create-property",
  auth(Role.LANDLORD), 
  upload.fields([
    {
      name: "images",
      maxCount: 5,
    },
  ]),
  validateRequest(PropertyValidations.createPropertyValidationSchema), 
  PropertyControllers.createProperty,
);

router.get(
  "/my-properties",
  auth(Role.LANDLORD),
  PropertyControllers.getMyProperties,
);

router.get("/all-properties", PropertyControllers.getAllProperties);

router.get("/:id", PropertyControllers.getSingleProperty);

router.patch(
  "/:id",
  auth(Role.LANDLORD, Role.ADMIN),
  upload.fields([
    {
      name: "images",
      maxCount: 5,
    },
  ]),
  validateRequest(PropertyValidations.updatePropertyValidationSchema),
  PropertyControllers.updateProperty,
);

router.delete(
  "/:id",
  auth(Role.LANDLORD, Role.ADMIN),
  PropertyControllers.deleteProperty,
);

export const PropertyRoutes = router;

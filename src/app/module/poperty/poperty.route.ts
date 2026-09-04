import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { PropertyControllers } from "./poperty.controller";

const router = Router();

router.post(
  "/",
  auth(Role.LANDLORD),
  PropertyControllers.createProperty
);

router.get(
  "/my-properties",
  auth(Role.LANDLORD),
  PropertyControllers.getMyProperties
);

router.get("/", PropertyControllers.getAllProperties);

router.get("/:id", PropertyControllers.getSingleProperty);

router.patch(
  "/:id",
  auth(Role.LANDLORD),
  PropertyControllers.updateProperty
);

router.delete(
  "/:id",
  auth(Role.LANDLORD, Role.ADMIN),
  PropertyControllers.deleteProperty
);

export const PropertyRoutes = router;
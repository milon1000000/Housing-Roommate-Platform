import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { RoomControllers } from "./room.controller";
import { RoomValidations } from "./room.validation";

const router = Router();

router.post(
  "/create-room",
  auth(Role.LANDLORD),
  validateRequest(RoomValidations.createRoomValidationSchema),
  RoomControllers.createRoom
);

router.get("/property/:propertyId", RoomControllers.getRoomsByProperty);

router.get("/:id", RoomControllers.getSingleRoom);

router.patch(
  "/:id",
  auth(Role.LANDLORD),
  validateRequest(RoomValidations.updateRoomValidationSchema),
  RoomControllers.updateRoom
);

router.delete(
  "/:id",
  auth(Role.LANDLORD),
  RoomControllers.deleteRoom
);

export const RoomRoutes = router;
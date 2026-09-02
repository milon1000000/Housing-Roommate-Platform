import { upload } from './../../lib/multer';
import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { UserController } from './user.controller';

const router = Router();
router.get("/me",auth(Role.ADMIN,Role.LANDLORD,Role.SUPER_ADMIN,Role.TENANT),UserController.getMe)
router.patch("/update-profile",auth(Role.SUPER_ADMIN,Role.ADMIN,Role.LANDLORD,Role.TENANT),upload.single("profileImage"),UserController.updateProfile);

export const UserRouters = router;

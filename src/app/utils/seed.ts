import bcrypt from "bcryptjs";
import { LandlordVerificationStatus, Role } from "../../generated/prisma/enums";
import config from "../config";
import { prisma } from "../lib/prisma";

// Create Tester Admin
export const seedTesterAdmin = async () => {
	try {
		const isTesterAdminExist = await prisma.user.findUnique({
			where: {
				email: config.tester_admin_email,
			},
		});

		if (isTesterAdminExist) {
			console.log("Tester Admin Already Exists!");
			return;
		}

		const name = config.tester_admin_name;
		const email = config.tester_admin_email;
		const password = config.tester_admin_password;

		if (!name || !email || !password) {
			throw new Error(
				"Tester Admin Name , Email, Password Missing In Env File!!!",
			);
		}

		const hashedPassword = await bcrypt.hash(
			password,
			Number(config.bcrypt_salt_rounds),
		);

		const testerAdmin = await prisma.user.create({
			data: {
				name,
				email,
				password: hashedPassword,
				role: Role.ADMIN,
				needPasswordChange: false,
				emailVerified: true,
			},
		});

		console.log("Tester Admin Created : ", testerAdmin);
	} catch (error) {
		console.log("Error Seeding Tester Admin : ", error);
	}
};

// Create Tester Landlord
export const seedTesterLandlord = async () => {
	try {
		const isTesterLandlordExist = await prisma.user.findUnique({
			where: {
				email: config.tester_landloar_email,
			},
		});

		if (isTesterLandlordExist) {
			console.log("Tester Landlord Already Exists!");
			return;
		}

		const name = config.tester_landloar_name;
		const email = config.tester_landloar_email;
		const password = config.tester_landloar_password;

		if (!name || !email || !password) {
			throw new Error(
				"Tester Landlord Name , Email, Password Missing In Env File!!!",
			);
		}

		const hashedPassword = await bcrypt.hash(
			password,
			Number(config.bcrypt_salt_rounds),
		);

		const testerLandlord = await prisma.user.create({
			data: {
				name,
				email,
				password: hashedPassword,
				role: Role.LANDLORD,
				needPasswordChange: false,
				emailVerified: true,
				landlord: {
					create: {
						name,
						email,
						contactNumber: "01700000000",
						address: "Dhaka, Bangladesh",
						nidOrPassportNumber: "1234567890",
						verificationStatus: LandlordVerificationStatus.APPROVED,
					},
				},
			},
		});

		console.log("Tester Landlord Created : ", testerLandlord);
	} catch (error) {
		console.log("Error Seeding Tester Landlord : ", error);
	}
};

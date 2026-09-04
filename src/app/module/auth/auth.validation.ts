import z from "zod";

const TenantRegistrationZodSchema = z.object({
	name: z
		.string("Not A String!!!!!")
		.min(3, "Name must atleast 3 characters long!!!")
		.max(30),
	email: z.string().email("Not email!!"),
	password: z
		.string()
		.min(8, "Password Must Minimum 8 Characters Long.")
		.regex(/[a-z]/, "Password must contain atleast 1 Lowercase Letter")
		.regex(/[A-Z]/, "Password must contain atleast 1 Uppercase Letter")
		.regex(/[0-9]/, "Password must contain atleast 1 Number")
		.regex(/[^A-Za-z0-9]/, "Password must contain atleast 1 Special Character"),
	tenant: z
		.object({
			contactNumber: z.string().optional(),
			address: z.string().optional(),
		})
		.optional(),
});

const TenantEmailVerifyZodSchema = z.object({
	email: z.string().email("Not email!!"),
	otp: z.string().length(6),
});

const LoginZodSchema = z.object({
	email: z.string().email(),
	password: z
		.string()
		.min(8, "Password Must Minimum 8 Characters Long.")
		.regex(/[a-z]/, "Password must contain atleast 1 Lowercase Letter")
		.regex(/[A-Z]/, "Password must contain atleast 1 Uppercase Letter")
		.regex(/[0-9]/, "Password must contain atleast 1 Number")
		.regex(/[^A-Za-z0-9]/, "Password must contain atleast 1 Special Character"),
});

const ForgotZodSchema = z.object({
	email: z.string().email(),
});

const ResetZodSchema = z.object({
	email: z.string().email(),
	newPassword: z
		.string()
		.min(8, "Password Must Minimum 8 Characters Long.")
		.regex(/[a-z]/, "Password must contain atleast 1 Lowercase Letter")
		.regex(/[A-Z]/, "Password must contain atleast 1 Uppercase Letter")
		.regex(/[0-9]/, "Password must contain atleast 1 Number")
		.regex(/[^A-Za-z0-9]/, "Password must contain atleast 1 Special Character"),
	otp: z.string().length(6),
});

export const UserValidation = {
	TenantRegistrationZodSchema,
	TenantEmailVerifyZodSchema,
	LoginZodSchema,
	ForgotZodSchema,
	ResetZodSchema,
};

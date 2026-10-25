import { z } from "zod";

const sendEmailZodSchema = z.object({
  name: z
    .string({ message: "Name is required" })
    .min(1, "Name cannot be empty"),
  email: z
    .string({ message: "Email is required" })
    .email("Please provide a valid email address"),
  message: z
    .string({ message: "Message is required" })
    .min(1, "Message cannot be empty"),
});

export const UserValidation = {
  sendEmailZodSchema,
};
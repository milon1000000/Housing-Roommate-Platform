import { z } from "zod";

const createPropertyValidationSchema = z.object({
  title: z
    .string({ error: "Title is required" })
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title cannot exceed 200 characters"),
  description: z
    .string({ error: "Description is required" })
    .min(10, "Description must be at least 10 characters"),
  address: z
    .string({ error: "Address is required" })
    .min(5, "Address must be at least 5 characters"),
  city: z
    .string({ error: "City is required" })
    .min(2, "City must be at least 2 characters"),
  rentPrice: z.coerce
    .number({ error: "Rent price is required" })
    .positive("Rent price must be a positive number"),
  totalRooms: z.coerce
    .number({ error: "Total rooms is required" })
    .int("Total rooms must be an integer")
    .positive("Total rooms must be a positive number"),
  amenities: z
    .preprocess((val) => {
      if (typeof val === "string") {
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          return val
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
        }
      }
      return val;
    }, z.array(z.string()))
    .optional(),
  isAvailable: z.coerce.boolean().optional(),
});

const updatePropertyValidationSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title cannot exceed 200 characters")
    .optional(),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .optional(),
  address: z
    .string()
    .min(5, "Address must be at least 5 characters")
    .optional(),
  city: z.string().min(2, "City must be at least 2 characters").optional(),
  rentPrice: z.coerce
    .number()
    .positive("Rent price must be a positive number")
    .optional(),
  totalRooms: z.coerce
    .number()
    .int("Total rooms must be an integer")
    .positive("Total rooms must be a positive number")
    .optional(),
  amenities: z
    .preprocess((val) => {
      if (typeof val === "string") {
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          return val
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
        }
      }
      return val;
    }, z.array(z.string()))
    .optional(),
  isAvailable: z.coerce.boolean().optional(),
});

export const PropertyValidations = {
  createPropertyValidationSchema,
  updatePropertyValidationSchema,
};

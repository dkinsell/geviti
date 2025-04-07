import { z } from "zod";

export const predictionInputSchema = z.object({
  squareFootage: z
    .number()
    .positive()
    .max(10000, "Square footage must be less than 10,000"),
  bedrooms: z
    .number()
    .int()
    .min(1, "Minimum 1 bedroom")
    .max(10, "Maximum 10 bedrooms"),
});

export type PredictionInputSchema = z.infer<typeof predictionInputSchema>;

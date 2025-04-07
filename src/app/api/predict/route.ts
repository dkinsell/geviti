import { NextResponse } from "next/server";
import { predictionInputSchema } from "@/lib/validations/predictionSchema";
import mlService from "@/services/ml/mlService";
import { ZodError } from "zod";

export async function POST(request: Request) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = predictionInputSchema.parse(body);

    // Get prediction from ML service
    const prediction = await mlService.predict(validatedData);

    return NextResponse.json(prediction);
  } catch (error) {
    console.error("Prediction error:", error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Invalid input data",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "Failed to process prediction",
      },
      { status: 500 },
    );
  }
}

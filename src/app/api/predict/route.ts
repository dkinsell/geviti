import { NextResponse } from "next/server";
import { predictionInputSchema } from "@/lib/validations/predictionSchema";
import mlService from "@/services/ml/mlService";
import { ZodError } from "zod";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = predictionInputSchema.parse(body);

    console.log("API: Processing prediction request for:", validatedData);
    const prediction = await mlService.predict(validatedData);
    console.log("API: Prediction successful:", prediction);

    return NextResponse.json(prediction);
  } catch (error) {
    console.error("API: Prediction error:", error);

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

    // Add more specific error handling
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        code: "PREDICTION_ERROR",
        message: "Failed to process prediction",
        details: errorMessage,
      },
      { status: 500 },
    );
  }
}

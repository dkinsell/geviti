import { NextResponse } from "next/server";
import { ZodError } from "zod";
import mlService from "@/services/ml/mlService";
import { predictionInputSchema } from "@/lib/validations/predictionSchema";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = predictionInputSchema.parse(body);

    console.log("API: Processing prediction request for:", validatedData);
    // Ensure ML service is initialized before predicting
    await mlService.initialize();
    const prediction = await mlService.predict(validatedData);
    console.log("API: Prediction successful:", prediction);

    return NextResponse.json(prediction);
  } catch (error) {
    // Log the full error object for detailed debugging
    console.error("API Predict Error:", error);

    let statusCode = 500;
    let errorCode = "PREDICTION_ERROR";
    let message = "Failed to process prediction";
    let details: unknown =
      error instanceof Error ? error.message : "Unknown error";

    if (error instanceof ZodError) {
      statusCode = 400;
      errorCode = "VALIDATION_ERROR";
      message = "Invalid input data";
      details = error.errors;
    } else if (error instanceof Error) {
      // Capture specific ML service errors if needed
      if (error.message.includes("Model initialization failed")) {
        errorCode = "ML_INIT_ERROR";
        message = "Machine learning service failed to initialize.";
      }
    }

    return NextResponse.json(
      {
        code: errorCode,
        message: message,
        details: details,
      },
      { status: statusCode },
    );
  }
}

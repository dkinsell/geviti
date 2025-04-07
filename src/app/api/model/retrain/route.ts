import { NextResponse } from "next/server";
import mlService from "@/services/ml/mlService";

export async function POST() {
  try {
    await mlService.trainNewModel();

    return NextResponse.json({
      message: "Model retrained successfully",
    });
  } catch (error) {
    console.error("Model retraining error:", error);

    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "Failed to retrain model",
      },
      { status: 500 },
    );
  }
}

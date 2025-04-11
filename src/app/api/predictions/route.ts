import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  console.log("API Predictions: GET request started.");

  try {
    // Remove file system checks since they don't apply to PostgreSQL
    const predictions = await prisma.predictionLog.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 10, // Limit to 10 most recent predictions
    });

    console.log(`API Predictions: Found ${predictions.length} predictions.`);
    return NextResponse.json(predictions);
  } catch (error) {
    console.error("API Predictions Error:", error);

    return NextResponse.json(
      {
        code: "FETCH_ERROR",
        message: "Failed to fetch prediction history",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

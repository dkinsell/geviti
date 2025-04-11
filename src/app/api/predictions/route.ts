import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    console.log("API: Fetching prediction history...");
    const predictions = await prisma.predictionLog.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 10, // Limit to the last 10 predictions
    });
    console.log(`API: Found ${predictions.length} predictions.`);
    return NextResponse.json(predictions);
  } catch (error) {
    // Log the full error object for detailed debugging
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

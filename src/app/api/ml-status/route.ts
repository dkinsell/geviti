import { NextResponse } from "next/server";
import mlService from "@/services/ml/mlService";

export async function GET() {
  try {
    let status = await mlService.getStatus();

    if (!status.isInitialized) {
      await mlService.initialize();
      status = await mlService.getStatus();
    }

    return NextResponse.json({
      status: "ok",
      ...status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("ML Status check failed:", error);
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

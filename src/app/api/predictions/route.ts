import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const predictions = await prisma.predictionLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10, // Limit to last 10 predictions
    });

    return NextResponse.json(predictions);
  } catch (error) {
    console.error("Error fetching predictions:", error);

    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch predictions",
      },
      { status: 500 },
    );
  }
}

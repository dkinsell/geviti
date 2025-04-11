import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import fs from "fs";

export async function GET() {
  const dbPath = process.env.DATABASE_URL?.replace("file:", "");

  try {
    console.log(
      `API Predictions: Runtime DATABASE_URL: ${process.env.DATABASE_URL}`,
    );
    if (dbPath) {
      const dbExists = fs.existsSync(dbPath);
      console.log(
        `API Predictions: Database file at ${dbPath} exists: ${dbExists}`,
      );
      if (!dbExists) {
        // Log directory contents if file doesn't exist
        try {
          const tmpContents = fs.readdirSync("/tmp");
          console.log(
            "API Predictions: Contents of /tmp directory:",
            tmpContents,
          );
        } catch (readdirError) {
          console.error(
            "API Predictions: Failed to read /tmp directory:",
            readdirError,
          );
        }
      }
    } else {
      console.warn(
        "API Predictions: DATABASE_URL environment variable is not set or invalid.",
      );
    }

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
    console.error("API Predictions Error:", error);
    console.error(`API Predictions Error Context: DB Path: ${dbPath}`);

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

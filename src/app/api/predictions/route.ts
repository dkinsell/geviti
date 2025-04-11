import { NextResponse } from "next/server";
console.log("API Predictions: Imports loaded (NextResponse)");
import prisma from "@/lib/db";
console.log("API Predictions: Imports loaded (prisma)");
import fs from "fs";
console.log("API Predictions: Imports loaded (fs)");

export async function GET() {
  console.log("API Predictions: GET request started.");
  let dbPath: string | undefined;

  try {
    console.log("API Predictions: Inside try block.");
    dbPath = process.env.DATABASE_URL?.replace("file:", "");
    console.log(`API Predictions: Calculated dbPath: ${dbPath}`);

    console.log(
      `API Predictions: Runtime DATABASE_URL: ${process.env.DATABASE_URL}`,
    );

    if (dbPath) {
      console.log("API Predictions: Checking database existence...");
      const dbExists = fs.existsSync(dbPath);
      console.log(
        `API Predictions: Database file at ${dbPath} exists: ${dbExists}`,
      );
      if (!dbExists) {
        console.log(
          "API Predictions: Database file not found. Reading /tmp...",
        );
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

    console.log("API Predictions: Attempting to fetch prediction history..."); // Log before prisma call
    const predictions = await prisma.predictionLog.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });
    console.log(`API Predictions: Found ${predictions.length} predictions.`);
    return NextResponse.json(predictions);
  } catch (error) {
    console.error("API Predictions Error:", error);
    console.error(`API Predictions Error Context: DB Path used: ${dbPath}`);

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

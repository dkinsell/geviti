import { PrismaClient } from "@prisma/client";
import * as tf from "@tensorflow/tfjs-node";
import { trainModel } from "../src/services/ml/trainer";
import { saveModel } from "../src/services/ml/persistence";
import { TrainingDataItem } from "../src/types/PredictionTypes";
import { put } from "@vercel/blob";
import fs from "fs/promises";
import path from "path";

// Define consistent blob names
const MODEL_JSON_BLOB_NAME = "model.json";
const MODEL_WEIGHTS_BLOB_NAME = "model.weights.bin"; // Keep this for the Blob upload name
const NORMALIZATION_PARAMS_BLOB_NAME = "normalization.json";

// Define the local path where saveModel saves files when running locally (!IS_VERCEL)
const LOCAL_DEV_MODEL_DIR = path.join(process.cwd(), "public", "model");
const LOCAL_DEV_MODEL_JSON_PATH = path.join(LOCAL_DEV_MODEL_DIR, "model.json");
// Adjust the expected weights filename based on what's actually saved locally
const LOCAL_DEV_MODEL_WEIGHTS_PATH = path.join(
  LOCAL_DEV_MODEL_DIR,
  "weights.bin", // <-- Corrected filename
);
const LOCAL_DEV_NORMALIZATION_PARAMS_PATH = path.join(
  LOCAL_DEV_MODEL_DIR,
  "normalization.json",
);

// Note: The Vercel build environment uses /tmp, but saveModel handles that internally.
// This script only needs to know where saveModel *actually* saved the files
// in the current environment (which is LOCAL_DEV_MODEL_DIR when run locally).

async function preBuildTrain() {
  const prisma = new PrismaClient();

  try {
    console.log("Starting pre-build model training...");

    const trainingData = await prisma.trainingData.findMany();
    if (trainingData.length === 0) {
      throw new Error("No training data available for pre-build training");
    }

    const transformedData = trainingData.map((item) => ({
      ...item,
      price: Number(item.price),
    }));

    console.log(`Training model with ${transformedData.length} data points...`);
    const result = await trainModel(tf, transformedData as TrainingDataItem[], {
      epochs: 200,
      batchSize: 4,
    });

    // Save model locally first
    // saveModel handles saving to public/model locally, or /tmp in Vercel build
    await saveModel(result.model, result.normalizationParams);
    console.log(`Model and params saved locally by saveModel function.`);

    // --- Upload to Vercel Blob ---
    console.log("Uploading model files to Vercel Blob...");

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error("BLOB_READ_WRITE_TOKEN environment variable is not set.");
    }

    // Read the locally saved files from the correct local dev path
    console.log(`Reading files for upload from: ${LOCAL_DEV_MODEL_DIR}`);
    // Use the LOCAL_DEV_... paths here
    const modelJsonContent = await fs.readFile(LOCAL_DEV_MODEL_JSON_PATH);
    // Read the correctly named weights file
    const modelWeightsContent = await fs.readFile(LOCAL_DEV_MODEL_WEIGHTS_PATH);
    const normalizationParamsContent = await fs.readFile(
      LOCAL_DEV_NORMALIZATION_PARAMS_PATH,
    );

    // Upload each file using put, allowing overwrite
    const [modelJsonBlob, modelWeightsBlob, normalizationParamsBlob] =
      await Promise.all([
        put(MODEL_JSON_BLOB_NAME, modelJsonContent, {
          access: "public",
          token: process.env.BLOB_READ_WRITE_TOKEN,
          contentType: "application/json",
          allowOverwrite: true, // Add allowOverwrite
        }),
        put(MODEL_WEIGHTS_BLOB_NAME, modelWeightsContent, {
          access: "public",
          token: process.env.BLOB_READ_WRITE_TOKEN,
          contentType: "application/octet-stream",
          allowOverwrite: true, // Add allowOverwrite
        }),
        put(NORMALIZATION_PARAMS_BLOB_NAME, normalizationParamsContent, {
          access: "public",
          token: process.env.BLOB_READ_WRITE_TOKEN,
          contentType: "application/json",
          allowOverwrite: true, // Add allowOverwrite
        }),
      ]);

    console.log(`Uploaded model.json to Blob: ${modelJsonBlob.url}`);
    console.log(`Uploaded model.weights.bin to Blob: ${modelWeightsBlob.url}`);
    console.log(
      `Uploaded normalization.json to Blob: ${normalizationParamsBlob.url}`,
    );

    console.log(
      "Pre-build model training and Blob upload completed successfully",
    );
  } catch (error) {
    console.error("Error during pre-build training or Blob upload:", error);
    process.exit(1); // Exit with error code if anything fails
  } finally {
    await prisma.$disconnect();
  }
}

preBuildTrain();

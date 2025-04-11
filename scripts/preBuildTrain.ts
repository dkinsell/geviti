import { PrismaClient } from "@prisma/client";
import * as tf from "@tensorflow/tfjs-node";
import { trainModel } from "../src/services/ml/trainer";
import { saveModel, IS_VERCEL } from "../src/services/ml/persistence";
import { TrainingDataItem } from "../src/types/PredictionTypes";
import { put } from "@vercel/blob";
import fs from "fs/promises";
import path from "path";

const MODEL_JSON_BLOB_NAME = "model.json";
const MODEL_WEIGHTS_BLOB_NAME = "model.weights.bin";
const NORMALIZATION_PARAMS_BLOB_NAME = "normalization.json";

const LOCAL_DEV_MODEL_DIR = path.join(process.cwd(), "public", "model");
const LOCAL_DEV_MODEL_JSON_PATH = path.join(LOCAL_DEV_MODEL_DIR, "model.json");
const LOCAL_DEV_MODEL_WEIGHTS_PATH = path.join(
  LOCAL_DEV_MODEL_DIR,
  "weights.bin",
);
const LOCAL_DEV_NORMALIZATION_PARAMS_PATH = path.join(
  LOCAL_DEV_MODEL_DIR,
  "normalization.json",
);

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

    await saveModel(result.model, result.normalizationParams);
    if (IS_VERCEL) {
      console.log("saveModel handled Blob upload during Vercel build.");
    } else {
      console.log(`Model and params saved locally by saveModel function.`);
    }

    if (!IS_VERCEL) {
      console.log(
        "Local preBuildTrain: Manually reading files and uploading to Blob for testing...",
      );

      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        throw new Error(
          "BLOB_READ_WRITE_TOKEN environment variable is not set for local preBuildTrain upload.",
        );
      }

      console.log(`Reading files for upload from: ${LOCAL_DEV_MODEL_DIR}`);
      const modelJsonContent = await fs.readFile(LOCAL_DEV_MODEL_JSON_PATH);
      const modelWeightsContent = await fs.readFile(
        LOCAL_DEV_MODEL_WEIGHTS_PATH,
      );
      const normalizationParamsContent = await fs.readFile(
        LOCAL_DEV_NORMALIZATION_PARAMS_PATH,
      );

      const [modelJsonBlob, modelWeightsBlob, normalizationParamsBlob] =
        await Promise.all([
          put(MODEL_JSON_BLOB_NAME, modelJsonContent, {
            access: "public",
            token: process.env.BLOB_READ_WRITE_TOKEN,
            contentType: "application/json",
            allowOverwrite: true,
          }),
          put(MODEL_WEIGHTS_BLOB_NAME, modelWeightsContent, {
            access: "public",
            token: process.env.BLOB_READ_WRITE_TOKEN,
            contentType: "application/octet-stream",
            allowOverwrite: true,
          }),
          put(NORMALIZATION_PARAMS_BLOB_NAME, normalizationParamsContent, {
            access: "public",
            token: process.env.BLOB_READ_WRITE_TOKEN,
            contentType: "application/json",
            allowOverwrite: true,
          }),
        ]);

      console.log(
        `(Local Test) Uploaded model.json to Blob: ${modelJsonBlob.url}`,
      );
      console.log(
        `(Local Test) Uploaded model.weights.bin to Blob: ${modelWeightsBlob.url}`,
      );
      console.log(
        `(Local Test) Uploaded normalization.json to Blob: ${normalizationParamsBlob.url}`,
      );
    } else {
      console.log("Vercel Build: Skipping manual file read/upload step.");
    }

    console.log(
      "Pre-build model training and potential Blob upload completed successfully",
    );
  } catch (error) {
    console.error("Error during pre-build training or Blob upload:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

preBuildTrain();

import * as tf from "@tensorflow/tfjs-node";
import { NormalizationParams } from "@/types/PredictionTypes";
import path from "path";
import fs from "fs";

const IS_VERCEL = process.env.VERCEL === "1";
const MODEL_DIR = IS_VERCEL
  ? "/tmp"
  : path.join(
      process.cwd(),
      path.dirname(process.env.ML_MODEL_PATH || "public/model/model.json"),
    );
const MODEL_PATH = `file://${path.join(MODEL_DIR, "model.json")}`;
const PARAMS_PATH = path.join(MODEL_DIR, "normalization.json");

/**
 * Saves the trained model and normalization parameters
 */
export async function saveModel(
  model: tf.LayersModel,
  normalizationParams: NormalizationParams,
): Promise<void> {
  if (!fs.existsSync(MODEL_DIR)) {
    fs.mkdirSync(MODEL_DIR, { recursive: true });
  }

  await model.save(MODEL_PATH);

  fs.writeFileSync(PARAMS_PATH, JSON.stringify(normalizationParams, null, 2));
}

/**
 * Loads the model and normalization parameters
 */
export async function loadModel(): Promise<{
  model: tf.LayersModel;
  normalizationParams: NormalizationParams;
} | null> {
  try {
    if (!fs.existsSync(MODEL_PATH) || !fs.existsSync(PARAMS_PATH)) {
      return null;
    }

    const model = await tf.loadLayersModel(MODEL_PATH);

    const paramsJson = fs.readFileSync(PARAMS_PATH, "utf-8");
    const normalizationParams = JSON.parse(paramsJson) as NormalizationParams;

    return { model, normalizationParams };
  } catch (error) {
    console.error("Error loading model:", error);
    return null;
  }
}

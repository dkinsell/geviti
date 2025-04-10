import * as tfBrowser from "@tensorflow/tfjs";
import { NormalizationParams } from "@/types/PredictionTypes";
import path from "path";
import fs from "fs";

const IS_SERVER = typeof window === "undefined";
const IS_VERCEL = process.env.VERCEL === "1";

let modelDirPath: string;
let modelJsonPath: string;
let paramsPathOrKey: string;

const tfInstancePromise: Promise<typeof tfBrowser> = (async () => {
  if (IS_SERVER && !IS_VERCEL) {
    try {
      const tfNode = await import("@tensorflow/tfjs-node");
      const baseDir = IS_VERCEL
        ? "/tmp"
        : path.join(process.cwd(), "public", "model");

      modelDirPath = `file://${baseDir}`;
      modelJsonPath = `file://${path.join(baseDir, "model.json")}`;
      paramsPathOrKey = path.join(baseDir, "normalization.json");

      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
        console.log(`Created directory: ${baseDir}`);
      }

      console.log("Using tfjs-node in development server");
      console.log(
        `Persistence (Server): Using model DIR path (for save): ${modelDirPath}`,
      );
      console.log(
        `Persistence (Server): Using model JSON path (for load): ${modelJsonPath}`,
      );
      console.log(
        `Persistence (Server): Using params path/key: ${paramsPathOrKey}`,
      );

      return tfNode as unknown as typeof tfBrowser;
    } catch (e) {
      console.error("Failed to load tfjs-node:", e);
      throw e;
    }
  } else {
    try {
      if (IS_SERVER) {
        await import("@tensorflow/tfjs-backend-cpu");
        console.log("Using tfjs with CPU backend on Vercel");
      } else {
        await import("@tensorflow/tfjs-backend-webgl");
        await import("@tensorflow/tfjs-backend-cpu");
        console.log("Using tfjs with WebGL/CPU backends in browser");
      }

      modelDirPath = "indexeddb://housing-price-model";
      modelJsonPath = "indexeddb://housing-price-model";
      paramsPathOrKey = "housing-model-params";

      console.log(
        `Persistence (Browser/Vercel): Using model path: ${modelJsonPath}`,
      );
      console.log(
        `Persistence (Browser/Vercel): Using params path/key: ${paramsPathOrKey}`,
      );

      return tfBrowser;
    } catch (e) {
      console.error("Failed to load tfjs backends:", e);
      throw e;
    }
  }
})();

// --- saveModel ---
export async function saveModel(
  model: tfBrowser.LayersModel,
  normalizationParams: NormalizationParams,
): Promise<void> {
  try {
    const savePath = IS_SERVER ? modelDirPath : modelJsonPath;
    await model.save(savePath);
    console.log(`Model saved successfully to ${savePath}`);

    if (IS_SERVER) {
      fs.writeFileSync(
        paramsPathOrKey,
        JSON.stringify(normalizationParams, null, 2),
      );
      console.log(`Params saved successfully to file: ${paramsPathOrKey}`);
    } else {
      localStorage.setItem(
        paramsPathOrKey,
        JSON.stringify(normalizationParams),
      );
      console.log(
        `Params saved successfully to localStorage key: ${paramsPathOrKey}`,
      );
    }
  } catch (error) {
    const attemptedSavePath = IS_SERVER ? modelDirPath : modelJsonPath;
    console.error(`Error saving model to ${attemptedSavePath}:`, error);
    console.error(`Error context: Params path/key was ${paramsPathOrKey}`);
    throw error;
  }
}

// --- loadModel ---
export async function loadModel(): Promise<{
  model: tfBrowser.LayersModel;
  normalizationParams: NormalizationParams;
} | null> {
  try {
    const tf = await tfInstancePromise;
    const loadPath = IS_SERVER ? modelJsonPath : modelJsonPath;
    const model = await tf.loadLayersModel(loadPath);
    console.log(`Model loaded successfully from ${loadPath}`);

    let normalizationParams: NormalizationParams | null = null;

    if (IS_SERVER) {
      if (fs.existsSync(paramsPathOrKey)) {
        const paramsJson = fs.readFileSync(paramsPathOrKey, "utf-8");
        normalizationParams = JSON.parse(paramsJson);
        console.log(`Params loaded successfully from file: ${paramsPathOrKey}`);
      } else {
        console.warn(
          `Normalization params file not found at: ${paramsPathOrKey}`,
        );
      }
    } else {
      const paramsJson = localStorage.getItem(paramsPathOrKey);
      if (paramsJson) {
        normalizationParams = JSON.parse(paramsJson);
        console.log(
          `Params loaded successfully from localStorage key: ${paramsPathOrKey}`,
        );
      } else {
        console.warn(
          `Normalization params not found in localStorage key: ${paramsPathOrKey}`,
        );
      }
    }

    if (!normalizationParams) {
      console.error("Failed to load normalization parameters.");
      model.dispose();
      console.log("Disposed model due to missing normalization parameters.");
      return null;
    }

    return { model, normalizationParams };
  } catch (error) {
    const attemptedLoadPath = IS_SERVER ? modelJsonPath : modelJsonPath;
    const isNotFoundError =
      error instanceof Error &&
      (error.message.includes("Not found") ||
        error.message.includes("No model found") ||
        error.message.includes("ENOENT") ||
        error.message.includes("404") ||
        error.message.includes("store not found") ||
        error.message.includes("must be a file"));

    if (isNotFoundError) {
      console.log(
        `Model or params not found at ${attemptedLoadPath} / ${paramsPathOrKey}. Needs training or initial save.`,
      );
    } else {
      console.error(`Error loading model from ${attemptedLoadPath}:`, error);
      if (paramsPathOrKey) {
        console.error(`Error context: Params path/key was ${paramsPathOrKey}`);
      }
    }
    return null;
  }
}

import * as tfBrowser from "@tensorflow/tfjs";
import { NormalizationParams } from "@/types/PredictionTypes";
import path from "path";
import fs from "fs";
import { head, put } from "@vercel/blob";
import type { io } from "@tensorflow/tfjs-core";

const IS_SERVER = typeof window === "undefined";
const IS_VERCEL = IS_SERVER && process.env.VERCEL === "1";

const MODEL_JSON_BLOB_NAME = "model.json";
const MODEL_WEIGHTS_BLOB_NAME = "model.weights.bin";
const NORMALIZATION_PARAMS_BLOB_NAME = "normalization.json";

let modelSaveLoadPath: string;
let paramsPathOrKey: string;

// --- tfInstancePromise setup ---
const tfInstancePromise: Promise<typeof tfBrowser> = (async () => {
  if (IS_SERVER) {
    let tfNode: typeof tfBrowser | undefined;
    try {
      tfNode = (await import(
        "@tensorflow/tfjs-node"
      )) as unknown as typeof tfBrowser;
      console.log("Using @tensorflow/tfjs-node in server environment.");

      if (!IS_VERCEL) {
        const baseDir = path.join(process.cwd(), "public", "model");
        if (!fs.existsSync(baseDir)) {
          try {
            fs.mkdirSync(baseDir, { recursive: true });
            console.log(`Created model directory: ${baseDir}`);
          } catch (error) {
            console.error(`Error creating model directory: ${baseDir}`, error);
            throw error;
          }
        } else {
          console.log(`Model directory already exists: ${baseDir}`);
        }

        modelSaveLoadPath = `file://${baseDir}`;
        paramsPathOrKey = path.join(baseDir, "normalization.json");
        console.log(
          `Local Dev: Model save/load directory: ${modelSaveLoadPath}`,
        );
        console.log(`Local Dev: Params path: ${paramsPathOrKey}`);
      } else {
        console.log("Vercel Env: Model/Params will be handled via Blob.");
        modelSaveLoadPath = MODEL_JSON_BLOB_NAME;
        paramsPathOrKey = NORMALIZATION_PARAMS_BLOB_NAME;
      }
      return tfNode;
    } catch (e) {
      console.error("Error initializing TensorFlow backend:", e);
      console.warn(
        "Falling back to browser tfjs on the server - THIS MAY CAUSE ISSUES.",
      );
      modelSaveLoadPath = "indexeddb://housing-price-model";
      paramsPathOrKey = "housing-model-params";
      return tfBrowser;
    }
  } else {
    modelSaveLoadPath = "indexeddb://housing-price-model";
    paramsPathOrKey = "housing-model-params";
    console.log("Using tfjs in browser environment.");
    return Promise.resolve(tfBrowser);
  }
})();

// --- Custom IO Handler for saving to memory buffers ---
/**
 * Creates a custom TensorFlow.js IOHandler that saves model artifacts
 * to in-memory ArrayBuffers.
 * @returns {io.IOHandler & { modelArtifacts: io.ModelArtifacts | null }}
 */
function memorySaveHandler(): io.IOHandler & {
  modelArtifacts: io.ModelArtifacts | null;
} {
  const handler: io.IOHandler & { modelArtifacts: io.ModelArtifacts | null } = {
    modelArtifacts: null,
    save: async (artifacts: io.ModelArtifacts) => {
      if (!(artifacts.weightData instanceof ArrayBuffer)) {
        throw new Error(
          "Weight data is not an ArrayBuffer. Cannot save to memory.",
        );
      }
      handler.modelArtifacts = artifacts;
      return {
        modelArtifactsInfo: {
          dateSaved: new Date(),
          modelTopologyType: "JSON",
          modelTopologyBytes: artifacts.modelTopology
            ? JSON.stringify(artifacts.modelTopology).length
            : 0,
          weightSpecsBytes: artifacts.weightSpecs
            ? JSON.stringify(artifacts.weightSpecs).length
            : 0,
          weightDataBytes: artifacts.weightData.byteLength,
        },
      };
    },
    load: async () => {
      throw new Error("Load operation is not supported by memorySaveHandler.");
    },
  };
  return handler;
}

// --- Custom IO Handler for loading from Vercel Blob ---
/**
 * Creates a custom TensorFlow.js IOHandler that loads model artifacts
 * (topology and weights) from Vercel Blob storage URLs.
 * @returns {io.IOHandler} An IOHandler object.
 */
function blobLoadHandler(): io.IOHandler {
  return {
    load: async (): Promise<io.ModelArtifacts> => {
      console.log("BlobLoadHandler: Fetching Blob URLs for model artifacts...");

      // 1. Get URLs
      const [modelMeta, weightsMeta] = await Promise.all([
        head(MODEL_JSON_BLOB_NAME),
        head(MODEL_WEIGHTS_BLOB_NAME),
      ]);
      if (!modelMeta?.url)
        throw new Error(
          `BlobLoadHandler: Could not retrieve Blob URL for ${MODEL_JSON_BLOB_NAME}`,
        );
      if (!weightsMeta?.url)
        throw new Error(
          `BlobLoadHandler: Could not retrieve Blob URL for ${MODEL_WEIGHTS_BLOB_NAME}`,
        );
      console.log(`BlobLoadHandler: Model JSON URL: ${modelMeta.url}`);
      console.log(`BlobLoadHandler: Model Weights URL: ${weightsMeta.url}`);

      // 2. Fetch content
      console.log("BlobLoadHandler: Fetching model artifacts content...");
      const [modelJsonResponse, weightsResponse] = await Promise.all([
        fetch(modelMeta.url),
        fetch(weightsMeta.url),
      ]);
      if (!modelJsonResponse.ok)
        throw new Error(
          `BlobLoadHandler: Failed to fetch model.json from ${modelMeta.url}: ${modelJsonResponse.statusText}`,
        );
      if (!weightsResponse.ok)
        throw new Error(
          `BlobLoadHandler: Failed to fetch model.weights.bin from ${weightsMeta.url}: ${weightsResponse.statusText}`,
        );

      const modelJsonContent = await modelJsonResponse.json();
      const weightData = await weightsResponse.arrayBuffer();

      const modelTopology = modelJsonContent.modelTopology;
      const weightSpecs = modelJsonContent.weightsManifest?.[0]?.weights;

      if (!modelTopology) {
        throw new Error(
          "BlobLoadHandler: modelTopology not found in fetched model.json content.",
        );
      }
      if (!weightSpecs) {
        console.warn(
          "BlobLoadHandler: weightSpecs not found in fetched model.json content's weightsManifest.",
        );
      }

      console.log(
        `BlobLoadHandler: Extracted topology and fetched weights (${weightData.byteLength} bytes).`,
      );

      return {
        modelTopology: modelTopology,
        weightSpecs: weightSpecs,
        weightData: weightData,
      };
    },
    save: async () => {
      throw new Error("Save operation is not supported by blobLoadHandler.");
    },
  };
}

// --- saveModel ---
export async function saveModel(
  model: tfBrowser.LayersModel,
  normalizationParams: NormalizationParams,
): Promise<void> {
  try {
    await tfInstancePromise;

    if (IS_SERVER && IS_VERCEL) {
      console.log("Vercel Runtime: Saving model and params to Blob...");

      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        throw new Error(
          "BLOB_READ_WRITE_TOKEN environment variable is not set for runtime save.",
        );
      }
      const handler = memorySaveHandler();
      await model.save(handler);
      if (
        !handler.modelArtifacts?.modelTopology ||
        !handler.modelArtifacts?.weightData
      ) {
        throw new Error("Failed to capture model artifacts in memory.");
      }
      if (!(handler.modelArtifacts.weightData instanceof ArrayBuffer)) {
        throw new Error(
          "Captured weight data is not a single ArrayBuffer as expected.",
        );
      }

      const modelJsonBuffer = Buffer.from(
        JSON.stringify(handler.modelArtifacts.modelTopology),
      );
      const modelWeightsBuffer = Buffer.from(
        handler.modelArtifacts.weightData as ArrayBuffer,
      );
      const normalizationParamsBuffer = Buffer.from(
        JSON.stringify(normalizationParams, null, 2),
      );

      console.log("Uploading model artifacts and params to Vercel Blob...");
      const [modelJsonBlob, modelWeightsBlob, normalizationParamsBlob] =
        await Promise.all([
          put(MODEL_JSON_BLOB_NAME, modelJsonBuffer, {
            access: "public",
            token: process.env.BLOB_READ_WRITE_TOKEN,
            contentType: "application/json",
            allowOverwrite: true,
          }),
          put(MODEL_WEIGHTS_BLOB_NAME, modelWeightsBuffer, {
            access: "public",
            token: process.env.BLOB_READ_WRITE_TOKEN,
            contentType: "application/octet-stream",
            allowOverwrite: true,
          }),
          put(NORMALIZATION_PARAMS_BLOB_NAME, normalizationParamsBuffer, {
            access: "public",
            token: process.env.BLOB_READ_WRITE_TOKEN,
            contentType: "application/json",
            allowOverwrite: true,
          }),
        ]);
      console.log(`Uploaded model.json to Blob: ${modelJsonBlob.url}`);
      console.log(
        `Uploaded model.weights.bin to Blob: ${modelWeightsBlob.url}`,
      );
      console.log(
        `Uploaded normalization.json to Blob: ${normalizationParamsBlob.url}`,
      );
      console.log("Vercel runtime save to Blob completed (overwrite enabled).");
    } else if (IS_SERVER && !IS_VERCEL) {
      const saveDir = modelSaveLoadPath;
      await model.save(saveDir);
      console.log(`Model saved successfully to ${saveDir}`);
      fs.writeFileSync(
        paramsPathOrKey,
        JSON.stringify(normalizationParams, null, 2),
      );
      console.log(`Params saved successfully to file: ${paramsPathOrKey}`);
    } else {
      const savePath = modelSaveLoadPath;
      await model.save(savePath);
      console.log(`Model saved successfully to ${savePath}`);
      localStorage.setItem(
        paramsPathOrKey,
        JSON.stringify(normalizationParams),
      );
      console.log(
        `Params saved successfully to localStorage key: ${paramsPathOrKey}`,
      );
    }
  } catch (error) {
    const attemptedSaveLocation =
      IS_SERVER && IS_VERCEL
        ? `Vercel Blob (${MODEL_JSON_BLOB_NAME}, etc.)`
        : modelSaveLoadPath;
    const attemptedParamsLocation =
      IS_SERVER && IS_VERCEL
        ? `Vercel Blob (${NORMALIZATION_PARAMS_BLOB_NAME})`
        : paramsPathOrKey;

    console.error(`Error saving model to ${attemptedSaveLocation}:`, error);
    console.error(
      `Error context: Params location was ${attemptedParamsLocation}`,
    );
    throw error;
  }
}

// --- loadModel ---
export async function loadModel(): Promise<{
  model: tfBrowser.LayersModel;
  normalizationParams: NormalizationParams;
} | null> {
  let attemptedModelSource: string | io.IOHandler = "unknown";
  let attemptedParamsSource: string | undefined;

  try {
    const tf = await tfInstancePromise;

    let model: tfBrowser.LayersModel;
    let normalizationParams: NormalizationParams | null = null;

    if (IS_SERVER && IS_VERCEL) {
      console.log("Vercel Runtime: Using blobLoadHandler to load model...");
      const handler = blobLoadHandler();
      attemptedModelSource = handler;
      model = await tf.loadLayersModel(handler);
      console.log("Model loaded successfully via blobLoadHandler.");

      console.log("Vercel Runtime: Fetching Blob URL for params...");
      const paramsMeta = await head(NORMALIZATION_PARAMS_BLOB_NAME);
      if (!paramsMeta?.url) {
        throw new Error(
          `Could not retrieve Blob URL for ${NORMALIZATION_PARAMS_BLOB_NAME}`,
        );
      }
      attemptedParamsSource = paramsMeta.url;
      console.log(`Params Blob URL: ${attemptedParamsSource}`);
      const response = await fetch(attemptedParamsSource);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch normalization params from ${attemptedParamsSource}: ${response.statusText}`,
        );
      }
      normalizationParams = await response.json();
      console.log(
        `Params loaded successfully from Blob URL: ${attemptedParamsSource}`,
      );
    } else if (IS_SERVER && !IS_VERCEL) {
      if (!modelSaveLoadPath.startsWith("file://")) {
        throw new Error("Invalid local model path format for loading.");
      }
      const dirPath = modelSaveLoadPath.substring("file://".length);
      const modelJsonFilePath = `file://${path.join(dirPath, "model.json")}`;
      attemptedModelSource = modelJsonFilePath;
      attemptedParamsSource = paramsPathOrKey;
      console.log(`Local Dev: Loading model from ${attemptedModelSource}`);
      console.log(`Local Dev: Loading params from ${attemptedParamsSource}`);

      model = await tf.loadLayersModel(attemptedModelSource);
      console.log(`Model loaded successfully from ${attemptedModelSource}`);

      if (fs.existsSync(attemptedParamsSource)) {
        const paramsJson = fs.readFileSync(attemptedParamsSource, "utf-8");
        normalizationParams = JSON.parse(paramsJson);
        console.log(
          `Params loaded successfully from file: ${attemptedParamsSource}`,
        );
      } else {
        console.warn(
          `Normalization params file not found at: ${attemptedParamsSource}`,
        );
      }
    } else {
      attemptedModelSource = modelSaveLoadPath;
      attemptedParamsSource = paramsPathOrKey;
      console.log(`Browser: Loading model from ${attemptedModelSource}`);
      console.log(`Browser: Loading params from ${attemptedParamsSource}`);

      model = await tf.loadLayersModel(attemptedModelSource);
      console.log(`Model loaded successfully from ${attemptedModelSource}`);

      const paramsJson = localStorage.getItem(attemptedParamsSource);
      if (paramsJson) {
        normalizationParams = JSON.parse(paramsJson);
        console.log(
          `Params loaded successfully from localStorage key: ${attemptedParamsSource}`,
        );
      } else {
        console.warn(
          `Normalization params not found in localStorage key: ${attemptedParamsSource}`,
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
    const modelSourceStr =
      typeof attemptedModelSource === "string"
        ? attemptedModelSource
        : "blobLoadHandler";
    const paramsSourceStr =
      attemptedParamsSource || paramsPathOrKey || "unknown";

    const isNotFoundError =
      error instanceof Error &&
      (/Not found|No model found|ENOENT|404|store not found|failed to fetch|must be a file|Failed to fetch|Could not retrieve Blob URL/i.test(
        error.message,
      ) ||
        (error.cause instanceof Error &&
          /ENOTFOUND|ENOENT/i.test(error.cause.message)) ||
        (error instanceof TypeError && /fetch failed/i.test(error.message)));

    if (isNotFoundError) {
      console.log(
        `Model or params not found at ${modelSourceStr} / ${paramsSourceStr}. Needs training or initial save/upload.`,
        error,
      );
    } else {
      console.error(`Error loading model from ${modelSourceStr}:`, error);
      console.error(`Error context: Params source was ${paramsSourceStr}`);
    }
    return null;
  }
}

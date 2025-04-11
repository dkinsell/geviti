import * as tfBrowser from "@tensorflow/tfjs";
import {
  NormalizationParams,
  PredictionInput,
  PredictionResult,
  TrainingDataItem,
} from "../../types/PredictionTypes";
import prisma from "../../lib/db";
import { trainModel } from "./trainer";
import { loadModel, saveModel } from "./persistence";
import { predictPrice } from "./predictor";

const IS_SERVER = typeof window === "undefined";

const tfInstancePromise: Promise<typeof tfBrowser> = (async () => {
  if (IS_SERVER) {
    try {
      const tfNode = await import("@tensorflow/tfjs-node");
      console.log("MLService: Loaded @tensorflow/tfjs-node");
      return tfNode as unknown as typeof tfBrowser;
    } catch (e) {
      console.error("MLService: Failed to load @tensorflow/tfjs-node:", e);
      throw e;
    }
  } else {
    try {
      await import("@tensorflow/tfjs-backend-webgl");
      await import("@tensorflow/tfjs-backend-cpu");
      console.log("MLService: Loaded browser TFJS backends (WebGL, CPU)");
      return tfBrowser;
    } catch (e) {
      console.error("MLService: Failed to load browser backends:", e);
      throw e;
    }
  }
})();

class MLService {
  private model: tfBrowser.LayersModel | null = null;
  private normalizationParams: NormalizationParams | null = null;
  private isInitialized = false;
  private tfInstancePromise: Promise<typeof tfBrowser>;
  private backendInitialized: Promise<void> | null = null;

  constructor() {
    this.tfInstancePromise = tfInstancePromise;
  }

  private async initializeBackend(): Promise<void> {
    if (!this.backendInitialized) {
      this.backendInitialized = (async () => {
        const tf = await this.tfInstancePromise;
        try {
          if (IS_SERVER) {
            console.log(
              "MLService: TensorFlow.js backend configured for Node.js (CPU)",
            );
          } else {
            await tf.setBackend("webgl");
            console.log("MLService: TensorFlow.js backend set to WebGL");
          }
        } catch (e) {
          console.warn(
            "MLService: WebGL backend failed, falling back to CPU",
            e,
          );
          try {
            if (!IS_SERVER) {
              await tf.setBackend("cpu");
              console.log(
                "MLService: TensorFlow.js backend set to CPU (Browser Fallback)",
              );
            }
          } catch (cpuError) {
            console.error("MLService: Error setting CPU backend:", cpuError);
            throw new Error("Failed to initialize TensorFlow.js backend.");
          }
        }
      })();
    }
    return this.backendInitialized;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log("MLService: Initializing...");
    await this.initializeBackend();

    const loaded = await loadModel();

    if (loaded) {
      this.model = loaded.model;
      this.normalizationParams = loaded.normalizationParams;
      this.isInitialized = true;
      console.log("MLService: Model loaded successfully from persistence.");
    } else {
      console.log(
        "MLService: No saved model found, attempting to train a new one.",
      );
      await this.initializeBackend();
      if (IS_SERVER) {
        await this.trainNewModel();
      } else {
        console.warn(
          "MLService: Skipping initial training in browser environment.",
        );
      }
    }
  }

  async trainNewModel(): Promise<void> {
    await this.initializeBackend();
    const tf = await this.tfInstancePromise;

    if (!IS_SERVER) {
      console.warn(
        "MLService: Model training requested from browser environment. Aborting.",
      );
      throw new Error("Training from browser is not supported in this setup.");
    }

    try {
      const trainingData = await prisma.trainingData.findMany();
      if (trainingData.length === 0)
        throw new Error("No training data available in DB");
      console.log(
        `MLService: Training model with ${trainingData.length} data points...`,
      );

      const result = await trainModel(
        tf,
        trainingData as unknown as TrainingDataItem[],
        { epochs: 200, batchSize: 4 },
      );

      await saveModel(result.model, result.normalizationParams);

      this.model = result.model;
      this.normalizationParams = result.normalizationParams;
      this.isInitialized = true;
      console.log(
        `MLService: Model trained successfully with loss: ${result.loss}`,
      );
    } catch (error) {
      console.error("MLService: Error training model:", error);
      this.isInitialized = false;
      throw error;
    }
  }

  async predict(input: PredictionInput): Promise<PredictionResult> {
    try {
      if (!this.isInitialized || !this.model || !this.normalizationParams) {
        console.log("MLService: Not initialized. Attempting initialization...");
        await this.initialize();
        if (!this.isInitialized || !this.model || !this.normalizationParams) {
          throw new Error("Model initialization failed");
        }
        console.log("MLService: Initialization complete after check.");
      }

      this.validateInput(input);
      const tf = await this.tfInstancePromise;

      console.log("MLService: Making prediction with input:", input);
      const result = predictPrice(
        tf,
        this.model!,
        input,
        this.normalizationParams!,
      );
      console.log("MLService: Prediction result:", result);

      if (IS_SERVER) {
        await this.logPrediction(input, result);
      }

      return result;
    } catch (error) {
      console.error("MLService: Prediction error details:", {
        error,
        modelState: {
          isInitialized: this.isInitialized,
          hasModel: !!this.model,
          hasParams: !!this.normalizationParams,
        },
      });
      throw error;
    }
  }

  private validateInput(input: PredictionInput): void {
    if (
      typeof input.squareFootage !== "number" ||
      input.squareFootage <= 0 ||
      input.squareFootage > 10000
    ) {
      throw new Error("Square footage must be a positive number up to 10,000");
    }

    if (
      typeof input.bedrooms !== "number" ||
      !Number.isInteger(input.bedrooms) ||
      input.bedrooms < 1 ||
      input.bedrooms > 10
    ) {
      throw new Error("Bedrooms must be an integer between 1 and 10");
    }
  }

  private async logPrediction(
    input: PredictionInput,
    result: PredictionResult,
  ): Promise<void> {
    if (!IS_SERVER) {
      console.warn(
        "Attempted to log prediction from non-server environment. Skipping.",
      );
      return;
    }
    try {
      await prisma.predictionLog.create({
        data: {
          squareFootage: input.squareFootage,
          bedrooms: input.bedrooms,
          predictedPrice: result.price,
          confidence: result.confidence,
        },
      });
    } catch (error) {
      console.error("Error logging prediction:", error);
    }
  }

  async getStatus() {
    const tf = await this.tfInstancePromise;
    return {
      isInitialized: this.isInitialized,
      hasModel: !!this.model,
      hasParams: !!this.normalizationParams,
      backend: tf.getBackend(),
      modelPath: process.env.ML_MODEL_PATH,
    };
  }

  private static instance: MLService | null = null;

  static getInstance(): MLService {
    if (MLService.instance === null) {
      console.log("Creating new MLService instance.");
      MLService.instance = new MLService();
    }
    return MLService.instance;
  }
}

const mlServiceInstance = MLService.getInstance();
export default mlServiceInstance;

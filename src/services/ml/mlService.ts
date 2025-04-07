import * as tf from "@tensorflow/tfjs-node";
import prisma from "@/lib/db";
import {
  PredictionInput,
  PredictionResult,
  TrainingDataItem,
  NormalizationParams,
} from "@/types/PredictionTypes";
import { trainModel } from "./trainer";
import { loadModel, saveModel } from "./persistence";
import { predictPrice } from "./predictor";

/**
 * Main service for handling ML operations
 */
class MLService {
  private model: tf.LayersModel | null = null;
  private normalizationParams: NormalizationParams | null = null;
  private isInitialized = false;

  /**
   * Initializes the ML service, loading or training the model
   */
  async initialize(): Promise<void> {
    const loaded = await loadModel();

    if (loaded) {
      this.model = loaded.model;
      this.normalizationParams = loaded.normalizationParams;
      this.isInitialized = true;
      console.log("Model loaded successfully");
    } else {
      await this.trainNewModel();
    }
  }

  /**
   * Trains a new model using data from the database
   */
  async trainNewModel(): Promise<void> {
    try {
      const trainingData = await prisma.trainingData.findMany();

      if (trainingData.length === 0) {
        throw new Error("No training data available");
      }

      console.log(`Training model with ${trainingData.length} data points...`);

      const result = await trainModel(
        trainingData as unknown as TrainingDataItem[],
        {
          epochs: 200,
          batchSize: 4,
        },
      );

      await saveModel(result.model, result.normalizationParams);

      this.model = result.model;
      this.normalizationParams = result.normalizationParams;
      this.isInitialized = true;

      console.log(`Model trained successfully with loss: ${result.loss}`);
    } catch (error) {
      console.error("Error training model:", error);
      throw error;
    }
  }

  /**
   * Makes a housing price prediction
   */
  async predict(input: PredictionInput): Promise<PredictionResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.model || !this.normalizationParams) {
      throw new Error("Model not initialized");
    }

    this.validateInput(input);

    const result = predictPrice(this.model, input, this.normalizationParams);

    await this.logPrediction(input, result);

    return result;
  }

  /**
   * Validates prediction input
   */
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

  /**
   * Logs prediction to database
   */
  private async logPrediction(
    input: PredictionInput,
    result: PredictionResult,
  ): Promise<void> {
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

  /**
   * Gets the singleton instance of the ML service
   */
  static getInstance(): MLService {
    if (!global._mlServiceInstance) {
      global._mlServiceInstance = new MLService();
    }
    return global._mlServiceInstance;
  }
}

// Add to global in development to prevent multiple instances during hot reload
declare global {
  // eslint-disable-next-line no-var
  var _mlServiceInstance: MLService | undefined;
}

export default MLService.getInstance();

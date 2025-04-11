import { PrismaClient } from "@prisma/client";
import * as tf from "@tensorflow/tfjs-node";
import { trainModel } from "../src/services/ml/trainer";
import { saveModel } from "../src/services/ml/persistence";
import { TrainingDataItem } from "../src/types/PredictionTypes";

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
    console.log("Pre-build model training completed successfully");
  } catch (error) {
    console.error("Error during pre-build training:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

preBuildTrain();

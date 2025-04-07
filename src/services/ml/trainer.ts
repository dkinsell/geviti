import * as tf from "@tensorflow/tfjs-node";
import { TrainingDataItem, NormalizationParams } from "@/types/PredictionTypes";
import {
  calculateNormalizationParams,
  prepareTensorData,
} from "./preprocessor";
import { createModel } from "./modelArchitecture";

type Logs = { [key: string]: number };

/**
 * Training configuration options
 */
export interface TrainingOptions {
  epochs?: number;
  batchSize?: number;
  learningRate?: number;
  validationSplit?: number;
  callbacks?:
    | tf.Callback[]
    | {
        onTrainBegin?: (logs?: Logs) => void | Promise<void>;
        onTrainEnd?: (logs?: Logs) => void | Promise<void>;
        onEpochBegin?: (epoch: number, logs?: Logs) => void | Promise<void>;
        onEpochEnd?: (epoch: number, logs?: Logs) => void | Promise<void>;
        onBatchBegin?: (batch: number, logs?: Logs) => void | Promise<void>;
        onBatchEnd?: (batch: number, logs?: Logs) => void | Promise<void>;
      };
}

/**
 * Result of model training
 */
export interface TrainingResult {
  model: tf.LayersModel;
  normalizationParams: NormalizationParams;
  history: tf.History;
  loss: number;
}

/**
 * Trains a housing price prediction model using the provided training data
 */
export async function trainModel(
  trainingData: TrainingDataItem[],
  options: TrainingOptions = {},
): Promise<TrainingResult> {
  const normalizationParams = calculateNormalizationParams(trainingData);

  const { xs, ys } = prepareTensorData(trainingData, normalizationParams);

  const model = createModel();

  const defaultOptions = {
    epochs: 100,
    batchSize: 4,
    validationSplit: 0.2,
  };

  const finalOptions = { ...defaultOptions, ...options };

  const history = await model.fit(xs, ys, {
    epochs: finalOptions.epochs,
    batchSize: finalOptions.batchSize,
    validationSplit: finalOptions.validationSplit,
    callbacks: finalOptions.callbacks,
    shuffle: true,
  });

  const loss = history.history.loss[history.history.loss.length - 1] as number;

  xs.dispose();
  ys.dispose();

  return {
    model,
    normalizationParams,
    history,
    loss,
  };
}

/**
 * Evaluates model performance on training data
 */
export function evaluateModel(
  model: tf.LayersModel,
  trainingData: TrainingDataItem[],
  normalizationParams: NormalizationParams,
): number {
  const { xs, ys } = prepareTensorData(trainingData, normalizationParams);
  const evaluation = model.evaluate(xs, ys) as tf.Tensor;

  const loss = evaluation.dataSync()[0];

  xs.dispose();
  ys.dispose();
  evaluation.dispose();

  return loss;
}

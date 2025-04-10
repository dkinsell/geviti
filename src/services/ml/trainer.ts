import type * as tfTypes from "@tensorflow/tfjs";
import { TrainingDataItem, NormalizationParams } from "@/types/PredictionTypes";
import {
  calculateNormalizationParams,
  prepareTensorData,
} from "./preprocessor";
import { createModel } from "./modelArchitecture";

type Logs = { [key: string]: number };

export interface TrainingOptions {
  epochs?: number;
  batchSize?: number;
  learningRate?: number;
  validationSplit?: number;
  callbacks?:
    | tfTypes.Callback[]
    | {
        onTrainBegin?: (logs?: Logs) => void | Promise<void>;
        onTrainEnd?: (logs?: Logs) => void | Promise<void>;
        onEpochBegin?: (epoch: number, logs?: Logs) => void | Promise<void>;
        onEpochEnd?: (epoch: number, logs?: Logs) => void | Promise<void>;
        onBatchBegin?: (batch: number, logs?: Logs) => void | Promise<void>;
        onBatchEnd?: (batch: number, logs?: Logs) => void | Promise<void>;
      };
}

export interface TrainingResult {
  model: tfTypes.LayersModel;
  normalizationParams: NormalizationParams;
  history: tfTypes.History;
  loss: number;
}

/**
 * Trains a housing price prediction model using the provided training data
 */
export async function trainModel(
  tf: typeof tfTypes,
  trainingData: TrainingDataItem[],
  options: TrainingOptions = {},
): Promise<TrainingResult> {
  const normalizationParams = calculateNormalizationParams(trainingData);

  const { xs, ys } = prepareTensorData(tf, trainingData, normalizationParams);

  const model = createModel(tf);

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
    callbacks: finalOptions.callbacks as
      | tfTypes.CustomCallbackArgs
      | tfTypes.Callback[]
      | undefined,
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
  tf: typeof tfTypes,
  model: tfTypes.LayersModel,
  trainingData: TrainingDataItem[],
  normalizationParams: NormalizationParams,
): number {
  const { xs, ys } = prepareTensorData(tf, trainingData, normalizationParams);
  const evaluation = model.evaluate(xs, ys) as tfTypes.Tensor;

  const loss = evaluation.dataSync()[0];

  xs.dispose();
  ys.dispose();
  evaluation.dispose();

  return loss;
}

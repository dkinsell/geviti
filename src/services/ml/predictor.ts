import type * as tfTypes from "@tensorflow/tfjs";
import {
  PredictionInput,
  PredictionResult,
  NormalizationParams,
} from "@/types/PredictionTypes";
import { normalizeFeatures, denormalizePrice } from "./preprocessor";

/**
 * Makes a housing price prediction based on input features
 */
export function predictPrice(
  tf: typeof tfTypes,
  model: tfTypes.LayersModel,
  input: PredictionInput,
  normalizationParams: NormalizationParams,
): PredictionResult {
  const normalizedInput = normalizeFeatures(input, normalizationParams);

  const inputTensor = tf.tidy(() => {
    return tf.tensor2d([
      [normalizedInput.squareFootage, normalizedInput.bedrooms],
    ]);
  });

  const prediction = model.predict(inputTensor) as tfTypes.Tensor;
  const normalizedPrice = prediction.dataSync()[0];

  const price = denormalizePrice(normalizedPrice, normalizationParams);

  const squareFtConfidence = calculateRangeConfidence(
    input.squareFootage,
    normalizationParams.squareFootage.min,
    normalizationParams.squareFootage.max,
  );

  const bedroomsConfidence = calculateRangeConfidence(
    input.bedrooms,
    normalizationParams.bedrooms.min,
    normalizationParams.bedrooms.max,
  );

  const confidence = (squareFtConfidence + bedroomsConfidence) / 2;

  prediction.dispose();

  return {
    price: Math.round(price * 100) / 100,
    confidence,
    timestamp: new Date().toISOString(),
  };
}

function calculateRangeConfidence(
  value: number,
  min: number,
  max: number,
): number {
  if (value >= min && value <= max) {
    const middle = (min + max) / 2;
    const distance = Math.abs(value - middle) / (max - min);
    return 0.8 + (1 - distance) * 0.2;
  } else {
    const distanceToRange = value < min ? min - value : value - max;
    const rangeSize = max - min;
    const normalizedDistance = Math.min(distanceToRange / rangeSize, 1);
    return 0.8 - normalizedDistance * 0.3;
  }
}

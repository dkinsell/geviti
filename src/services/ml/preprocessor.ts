import type * as tfTypes from "@tensorflow/tfjs";
import {
  TrainingDataItem,
  NormalizedFeatures,
  NormalizationParams,
} from "@/types/PredictionTypes";

/**
 * Calculates normalization parameters from training data
 */
export function calculateNormalizationParams(
  data: TrainingDataItem[],
): NormalizationParams {
  const squareFootages = data.map((item) => item.squareFootage);
  const bedrooms = data.map((item) => item.bedrooms);
  const prices = data.map((item) => item.price);

  return {
    squareFootage: {
      min: Math.min(...squareFootages),
      max: Math.max(...squareFootages),
    },
    bedrooms: {
      min: Math.min(...bedrooms),
      max: Math.max(...bedrooms),
    },
    price: {
      min: Math.min(...prices),
      max: Math.max(...prices),
    },
  };
}

/**
 * Normalizes features to [0,1] range for better model performance
 */
export function normalizeFeatures(
  data: { squareFootage: number; bedrooms: number },
  params: NormalizationParams,
): NormalizedFeatures {
  return {
    squareFootage: normalize(
      data.squareFootage,
      params.squareFootage.min,
      params.squareFootage.max,
    ),
    bedrooms: normalize(
      data.bedrooms,
      params.bedrooms.min,
      params.bedrooms.max,
    ),
  };
}

/**
 * Normalizes a single value to [0,1] range
 */
function normalize(value: number, min: number, max: number): number {
  if (max === min) {
    return 0;
  }
  return (value - min) / (max - min);
}

/**
 * Denormalizes a prediction back to original price range
 */
export function denormalizePrice(
  normalizedPrice: number,
  params: NormalizationParams,
): number {
  return (
    normalizedPrice * (params.price.max - params.price.min) + params.price.min
  );
}

/**
 * Prepares tensor data for training from normalized features
 */
export function prepareTensorData(
  tf: typeof tfTypes,
  data: TrainingDataItem[],
  params: NormalizationParams,
): { xs: tfTypes.Tensor2D; ys: tfTypes.Tensor2D } {
  const normalizedFeatures = data.map((item) => {
    const normalized = normalizeFeatures(item, params);
    return [normalized.squareFootage, normalized.bedrooms];
  });

  const normalizedPrices = data.map((item) =>
    normalize(item.price, params.price.min, params.price.max),
  );

  const xs = tf.tensor2d(normalizedFeatures);
  const ys = tf.tensor2d(normalizedPrices, [normalizedPrices.length, 1]);

  return { xs, ys };
}

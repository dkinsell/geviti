/**
 * Input data for housing price prediction
 */
export interface PredictionInput {
  squareFootage: number;
  bedrooms: number;
}

/**
 * Result of a housing price prediction
 */
export interface PredictionResult {
  price: number;
  confidence: number;
  timestamp: string;
}

/**
 * Raw training data structure from database
 */
export interface TrainingDataItem {
  id: number;
  squareFootage: number;
  bedrooms: number;
  price: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Normalized features for model training
 */
export interface NormalizedFeatures {
  squareFootage: number;
  bedrooms: number;
}

/**
 * Feature normalization parameters
 */
export interface NormalizationParams {
  squareFootage: {
    min: number;
    max: number;
  };
  bedrooms: {
    min: number;
    max: number;
  };
  price: {
    min: number;
    max: number;
  };
}

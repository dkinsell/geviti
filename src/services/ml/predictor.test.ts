import * as tf from "@tensorflow/tfjs-node";
import { predictPrice } from "./predictor";
import { PredictionInput, NormalizationParams } from "@/types/PredictionTypes";

jest.mock("@tensorflow/tfjs-node", () => {
  return {
    tensor2d: jest.fn(() => ({
      dataSync: jest.fn(() => [0.75]), // Mock return normalized price
      dispose: jest.fn(),
    })),
    dispose: jest.fn(),
  };
});

describe("predictPrice", () => {
  // Create a mock model
  const mockModel = {
    predict: jest.fn(() => ({
      dataSync: jest.fn(() => [0.75]), // Mock normalized prediction value
      dispose: jest.fn(),
    })),
  } as unknown as tf.LayersModel;

  // Mock normalization parameters
  const mockNormParams: NormalizationParams = {
    squareFootage: { min: 800, max: 2600 },
    bedrooms: { min: 2, max: 5 },
    price: { min: 150000, max: 400000 },
  };

  // Mock input data
  const mockInput: PredictionInput = {
    squareFootage: 1500,
    bedrooms: 3,
  };

  it("should return a valid prediction result", () => {
    // Call the function
    const result = predictPrice(mockModel, mockInput, mockNormParams);

    // Check structure of the result
    expect(result).toHaveProperty("price");
    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("timestamp");

    // Expected price calculation: 0.75 * (400000 - 150000) + 150000 = 337500
    expect(result.price).toBeCloseTo(337500, 0); // Using approximate matching for floating point
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it("should have higher confidence for inputs within training range", () => {
    // Input within training range
    const inRangeResult = predictPrice(mockModel, mockInput, mockNormParams);

    // Input outside training range
    const outOfRangeInput: PredictionInput = {
      squareFootage: 5000, // Way above max
      bedrooms: 8, // Above max
    };
    const outOfRangeResult = predictPrice(
      mockModel,
      outOfRangeInput,
      mockNormParams,
    );

    expect(inRangeResult.confidence).toBeGreaterThan(
      outOfRangeResult.confidence,
    );
  });
});

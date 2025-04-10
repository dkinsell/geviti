import * as tf from "@tensorflow/tfjs";
import { predictPrice } from "./predictor";
import { PredictionInput, NormalizationParams } from "@/types/PredictionTypes";

// Mock the specific tfjs functions used by predictPrice
jest.mock("@tensorflow/tfjs", () => ({
  tidy: jest.fn((fn) => fn()),
  tensor2d: jest.fn(() => ({
    dataSync: jest.fn(() => [0.75]),
    dispose: jest.fn(),
  })),
  dispose: jest.fn(),
}));

// Mock tfjs-node as well, although tfjs is the primary one used statically now
jest.mock("@tensorflow/tfjs-node", () => ({
  tidy: jest.fn((fn) => fn()),
  tensor2d: jest.fn(() => ({
    dataSync: jest.fn(() => [0.75]),
    dispose: jest.fn(),
  })),
  dispose: jest.fn(),
}));

describe("predictPrice", () => {
  const mockModel = {
    predict: jest.fn(() => ({
      dataSync: jest.fn(() => [0.75]),
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

  // Clear mocks before each test
  beforeEach(() => {
    (tf.tidy as jest.Mock).mockClear();
    (tf.tensor2d as jest.Mock).mockClear();
    (mockModel.predict as jest.Mock).mockClear();
  });

  it("should return a valid prediction result", () => {
    const result = predictPrice(tf, mockModel, mockInput, mockNormParams);

    expect(result).toHaveProperty("price");
    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("timestamp");

    expect(result.price).toBeCloseTo(337500, 0);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);

    expect(tf.tidy).toHaveBeenCalledTimes(1);
    expect(tf.tensor2d).toHaveBeenCalledTimes(1);
    expect(mockModel.predict).toHaveBeenCalledTimes(1);
  });

  it("should have higher confidence for inputs within training range", () => {
    const inRangeResult = predictPrice(
      tf,
      mockModel,
      mockInput,
      mockNormParams,
    );

    const outOfRangeInput: PredictionInput = {
      squareFootage: 5000,
      bedrooms: 8,
    };
    const outOfRangeResult = predictPrice(
      tf,
      mockModel,
      outOfRangeInput,
      mockNormParams,
    );

    expect(inRangeResult.confidence).toBeGreaterThan(
      outOfRangeResult.confidence,
    );
  });
});

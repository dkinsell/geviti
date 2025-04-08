import { NextRequest } from "next/server";
import { POST } from "./route";
import mlService from "@/services/ml/mlService";

// Mock Next.js modules
jest.mock("next/server", () => ({
  NextRequest: jest.fn().mockImplementation((url, init) => ({
    url,
    method: init?.method || "GET",
    json: jest
      .fn()
      .mockImplementation(async () =>
        init?.body ? JSON.parse(init.body) : {},
      ),
    headers: {
      get: jest.fn(),
    },
  })),
  NextResponse: {
    json: jest.fn().mockImplementation((body, init) => ({
      status: init?.status || 200,
      body,
      json: async () => body,
    })),
  },
}));

// Mock the ML service
jest.mock("@/services/ml/mlService", () => ({
  predict: jest.fn(),
}));

describe("POST /api/predict", () => {
  // Original console.error to restore after tests
  const originalConsoleError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.error for clean test output
    console.error = jest.fn();
  });

  afterEach(() => {
    // Restore original console.error after each test
    console.error = originalConsoleError;
  });

  afterAll(() => {
    // Ensure original console.error is restored
    console.error = originalConsoleError;
  });

  it("returns a prediction when valid data is provided", async () => {
    // Mock implementation for this test
    const mockPredictionResult = {
      price: 250000,
      confidence: 0.9,
      timestamp: "2025-04-08T16:00:00.000Z",
    };

    (mlService.predict as jest.Mock).mockResolvedValue(mockPredictionResult);

    // Create test request
    const requestData = {
      squareFootage: 1500,
      bedrooms: 3,
    };

    const request = new NextRequest("http://localhost:3000/api/predict", {
      method: "POST",
      body: JSON.stringify(requestData),
    });

    // Call the API route
    const response = await POST(request);

    // Check response
    expect(response.status).toBe(200);
    const responseData = await response.json();
    expect(responseData).toEqual(mockPredictionResult);

    // Verify ML service was called with correct parameters
    expect(mlService.predict).toHaveBeenCalledWith(requestData);

    // Ensure console.error wasn't called in success path
    expect(console.error).not.toHaveBeenCalled();
  });

  it("returns a 400 error for invalid input", async () => {
    // Create test request with invalid data
    const request = new NextRequest("http://localhost:3000/api/predict", {
      method: "POST",
      body: JSON.stringify({
        squareFootage: -100, // Negative value, should fail validation
        bedrooms: 3,
      }),
    });

    // Call the API route
    const response = await POST(request);

    // Check response
    expect(response.status).toBe(400);
    const responseData = await response.json();
    expect(responseData).toHaveProperty("code", "VALIDATION_ERROR");
    expect(responseData).toHaveProperty("message", "Invalid input data");
    expect(responseData).toHaveProperty("details");

    // ML service should not be called for invalid input
    expect(mlService.predict).not.toHaveBeenCalled();

    // Console.error should have been called with validation error
    expect(console.error).toHaveBeenCalled();
  });

  it("returns a 500 error when the ML service throws an error", async () => {
    // Mock implementation to throw an error
    (mlService.predict as jest.Mock).mockRejectedValue(
      new Error("ML service error"),
    );

    // Create test request
    const request = new NextRequest("http://localhost:3000/api/predict", {
      method: "POST",
      body: JSON.stringify({
        squareFootage: 1500,
        bedrooms: 3,
      }),
    });

    // Call the API route
    const response = await POST(request);

    // Check response
    expect(response.status).toBe(500);
    const responseData = await response.json();
    expect(responseData).toHaveProperty("code", "INTERNAL_ERROR");
    expect(responseData).toHaveProperty(
      "message",
      "Failed to process prediction",
    );

    // Console.error should have been called with the ML service error
    expect(console.error).toHaveBeenCalled();
  });
});

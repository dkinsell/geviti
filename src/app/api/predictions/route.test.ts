import { NextResponse } from "next/server";
import { PredictionLog } from "@prisma/client";
import prisma from "@/lib/db";

// Mock the entire prisma module
jest.mock("@/lib/db", () => ({
  __esModule: true,
  default: {
    predictionLog: {
      findMany: jest.fn(),
    },
  },
}));

// Mock Next.js modules
jest.mock("next/server", () => ({
  NextRequest: jest.fn().mockImplementation((url) => ({
    url,
    method: "GET",
  })),
  NextResponse: {
    json: jest.fn().mockImplementation((body, init) => ({
      status: init?.status || 200,
      body,
      json: async () => body,
    })),
  },
}));

// Import the route handler after mocks
import { GET } from "./route";

describe("GET /api/predictions", () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  it("returns prediction history when database query succeeds", async () => {
    const mockPredictions: PredictionLog[] = [
      {
        id: 1,
        squareFootage: 1500,
        bedrooms: 3,
        predictedPrice: 250000,
        confidence: 0.92,
        createdAt: new Date("2025-04-08T16:00:00.000Z"),
        ipAddress: null,
      },
      {
        id: 2,
        squareFootage: 2000,
        bedrooms: 4,
        predictedPrice: 320000,
        confidence: 0.85,
        createdAt: new Date("2025-04-08T15:30:00.000Z"),
        ipAddress: null,
      },
    ];

    // Mock the findMany method using the prisma mock
    (prisma.predictionLog.findMany as jest.Mock).mockResolvedValue(
      mockPredictions,
    );

    (NextResponse.json as jest.Mock).mockReturnValue({
      status: 200,
      body: mockPredictions,
      json: async () => mockPredictions,
    });

    const response = await GET();
    expect(response.status).toBe(200);
    const responseData = await response.json();
    expect(responseData).toEqual(mockPredictions);
    expect(prisma.predictionLog.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    expect(console.error).not.toHaveBeenCalled();
  });

  it("returns a 500 error when the database query fails", async () => {
    // Mock the findMany method to reject
    (prisma.predictionLog.findMany as jest.Mock).mockRejectedValue(
      new Error("Database connection error"),
    );

    (NextResponse.json as jest.Mock).mockReturnValue({
      status: 500,
      body: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch prediction history",
      },
      json: async () => ({
        code: "INTERNAL_ERROR",
        message: "Failed to fetch prediction history",
      }),
    });

    const response = await GET();
    expect(response.status).toBe(500);
    const responseData = await response.json();
    expect(responseData).toHaveProperty("code", "INTERNAL_ERROR");
    expect(responseData).toHaveProperty(
      "message",
      "Failed to fetch prediction history",
    );
    expect(console.error).toHaveBeenCalled();
  });
});

import { render, screen } from "@testing-library/react";
import PredictionResultDisplay from "./PredictionResultDisplay";
import { usePrediction } from "@/components/providers/PredictionProvider";

// Mock the usePrediction hook
jest.mock("@/components/providers/PredictionProvider", () => {
  const originalModule = jest.requireActual(
    "@/components/providers/PredictionProvider",
  );
  return {
    ...originalModule,
    usePrediction: jest.fn(),
  };
});

describe("PredictionResultDisplay", () => {
  it("shows loading state", () => {
    (usePrediction as jest.Mock).mockReturnValue({
      predictionResult: null,
      isLoading: true,
      predictionError: null,
    });

    render(<PredictionResultDisplay />);

    expect(screen.getByText(/calculating prediction/i)).toBeInTheDocument();
  });

  it("shows error state", () => {
    const errorMessage = "Something went wrong";
    (usePrediction as jest.Mock).mockReturnValue({
      predictionResult: null,
      isLoading: false,
      predictionError: new Error(errorMessage),
    });

    render(<PredictionResultDisplay />);

    expect(screen.getByText(/prediction error/i)).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it("shows prediction result when available", () => {
    const mockResult = {
      price: 250000,
      confidence: 0.92,
      timestamp: "2025-04-08T16:00:00.000Z",
    };

    (usePrediction as jest.Mock).mockReturnValue({
      predictionResult: mockResult,
      isLoading: false,
      predictionError: null,
    });

    render(<PredictionResultDisplay />);

    // Test price is displayed with correct formatting
    expect(screen.getByText("$250,000.00")).toBeInTheDocument();

    // Test confidence percentage is displayed
    expect(screen.getByText(/92.0%/)).toBeInTheDocument();

    // Test timestamp is displayed
    expect(screen.getByText(/predicted on:/i)).toBeInTheDocument();
  });

  it("shows different confidence indicators based on confidence level", () => {
    // High confidence
    (usePrediction as jest.Mock).mockReturnValue({
      predictionResult: {
        price: 250000,
        confidence: 0.92,
        timestamp: "2025-04-08T16:00:00.000Z",
      },
      isLoading: false,
      predictionError: null,
    });

    const { rerender } = render(<PredictionResultDisplay />);

    // Medium confidence
    (usePrediction as jest.Mock).mockReturnValue({
      predictionResult: {
        price: 250000,
        confidence: 0.75,
        timestamp: "2025-04-08T16:00:00.000Z",
      },
      isLoading: false,
      predictionError: null,
    });

    rerender(<PredictionResultDisplay />);
    expect(screen.getByText(/75.0%/)).toBeInTheDocument();

    // Low confidence
    (usePrediction as jest.Mock).mockReturnValue({
      predictionResult: {
        price: 250000,
        confidence: 0.65,
        timestamp: "2025-04-08T16:00:00.000Z",
      },
      isLoading: false,
      predictionError: null,
    });

    rerender(<PredictionResultDisplay />);
    expect(screen.getByText(/65.0%/)).toBeInTheDocument();
  });

  it("shows idle state when no result, loading, or error", () => {
    (usePrediction as jest.Mock).mockReturnValue({
      predictionResult: null,
      isLoading: false,
      predictionError: null,
    });

    render(<PredictionResultDisplay />);

    expect(
      screen.getByText(/enter the house details above/i),
    ).toBeInTheDocument();
  });
});

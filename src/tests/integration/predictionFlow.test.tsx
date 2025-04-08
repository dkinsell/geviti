import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HomePage from "@/app/page";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PredictionResult } from "@/types/PredictionTypes";
import { PredictionProvider } from "@/components/providers/PredictionProvider";
import { PredictionLog } from "@prisma/client";

// Configure Jest to suppress React act() warnings
// This would typically go in your jest.setup.ts but we'll add it here for clarity
beforeAll(() => {
  const originalError = console.error;
  console.error = (...args) => {
    if (/act\(\.\.\./.test(args[0])) {
      return;
    }
    originalError.call(console, ...args);
  };
});

// Properly type the mocked fetch
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

// Create a delayed response helper to ensure loading states are visible
const createDelayedResponse = <T,>(
  data: T,
  delayMs = 100,
): Promise<Response> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        ok: true,
        json: () => Promise.resolve(data),
      } as unknown as Response);
    }, delayMs);
  });
};

// Setup mock responses with appropriate delays
const setupFetchMocks = () => {
  // Clear previous mocks
  (global.fetch as jest.Mock).mockReset();

  // Create a more robust mock implementation with delays
  (global.fetch as jest.Mock).mockImplementation(
    (url: string, options?: RequestInit) => {
      // Handle prediction API call with delay to ensure loading state appears
      if (url === "/api/predict" && options?.method === "POST") {
        return createDelayedResponse(
          {
            price: 250000,
            confidence: 0.92,
            timestamp: new Date("2025-04-08T16:00:00.000Z").toISOString(),
          } as PredictionResult,
          200,
        );
      }

      // Handle predictions history API call
      if (url === "/api/predictions") {
        return createDelayedResponse(
          [
            {
              id: 1,
              squareFootage: 1500,
              bedrooms: 3,
              predictedPrice: 250000,
              confidence: 0.92,
              createdAt: new Date("2025-04-08T16:00:00.000Z"),
              ipAddress: null,
            } as PredictionLog,
          ],
          100,
        );
      }

      // Default response for unexpected calls
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: "Not Found" }),
      } as Response);
    },
  );
};

const renderWithProviders = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <PredictionProvider>
        <HomePage />
      </PredictionProvider>
    </QueryClientProvider>,
  );
};

describe("Prediction Flow Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupFetchMocks();
  });

  it("completes the full prediction flow from form submission to result display", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    // Initial state check
    expect(screen.getByText(/housing price predictor/i)).toBeInTheDocument();
    expect(screen.getByText(/enter the house details/i)).toBeInTheDocument();

    // 1. Fill the prediction form
    const squareFootageInput = screen.getByLabelText(/square footage/i);
    const bedroomsInput = screen.getByLabelText(/bedrooms/i);
    const submitButton = screen.getByRole("button", { name: /predict price/i });

    await user.type(squareFootageInput, "1500");
    await user.type(bedroomsInput, "3");

    // 2. Submit the form
    await user.click(submitButton);

    // 4. Wait for results to appear
    await waitFor(
      () => {
        const priceElements = screen.getAllByText("$250,000.00");
        expect(priceElements.length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );

    // Check for confidence display
    const confidenceElement = screen.getByText(/92.*%.*conf/i);
    expect(confidenceElement).toBeInTheDocument();

    // 5. Verify all API calls were made with proper type assertion
    expect(global.fetch).toHaveBeenCalledTimes(2);

    // Use proper typing for the mock calls
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    expect(mockFetch.mock.calls).toEqual(
      expect.arrayContaining([
        // GET /api/predictions call (no options needed)
        ["/api/predictions"],
        // POST /api/predict call with options
        [
          "/api/predict",
          expect.objectContaining({
            method: "POST",
            body: expect.stringContaining("1500"),
            headers: expect.objectContaining({
              "Content-Type": "application/json",
            }),
          }),
        ],
      ]),
    );
  });
});

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HomePage from "@/app/page";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PredictionResult } from "@/types/PredictionTypes";
import { PredictionProvider } from "@/components/providers/PredictionProvider";
import { PredictionLog } from "@prisma/client";

beforeAll(() => {
  const originalError = console.error;
  console.error = (...args) => {
    if (/act\(\.\.\./.test(args[0])) {
      return;
    }
    originalError.call(console, ...args);
  };
});

global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

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
  (global.fetch as jest.Mock).mockReset();

  (global.fetch as jest.Mock).mockImplementation(
    (url: string, options?: RequestInit) => {
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

    // Initial state checks
    expect(screen.getByText("Property Details")).toBeInTheDocument();
    expect(
      screen.getByText(
        /enter property details in the form to calculate an estimated home price/i,
      ),
    ).toBeInTheDocument();

    // 1. Fill the prediction form
    const squareFootageInput = screen.getByLabelText(/square footage/i);
    const bedroomsInput = screen.getByLabelText(/number of bedrooms/i);
    const submitButton = screen.getByRole("button", {
      name: /predict price/i,
    });

    await user.type(squareFootageInput, "1500");
    await user.type(bedroomsInput, "3");

    // 2. Submit the form
    await user.click(submitButton);

    // Wait for loading state to appear
    expect(
      await screen.findByText(/calculating prediction/i),
    ).toBeInTheDocument();

    // Wait for results to appear
    await waitFor(
      () => {
        const priceElements = screen.getAllByText("$250,000.00");
        expect(priceElements.length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );

    // Check for confidence display - update to match the actual component output
    await waitFor(() => {
      expect(screen.getByText(/92\.0%/)).toBeInTheDocument();
      expect(screen.getByText(/confidence/i)).toBeInTheDocument();
    });

    // 5. Verify all API calls were made with proper type assertion
    expect(global.fetch).toHaveBeenCalledTimes(3);

    // Use proper typing for the mock calls
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    expect(mockFetch.mock.calls).toEqual(
      expect.arrayContaining([
        ["/api/predictions"],
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
        ["/api/predictions"],
      ]),
    );
  });
});

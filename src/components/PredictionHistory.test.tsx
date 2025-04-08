import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PredictionHistory from "./PredictionHistory";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PredictionLog } from "@prisma/client";

// Mock fetch function
global.fetch = jest.fn();

// Create mock prediction logs matching Prisma schema
const mockPredictionLogs: PredictionLog[] = [
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

// Refreshed logs to append for testing the refresh functionality
const refreshedLog: PredictionLog = {
  id: 3,
  squareFootage: 1800,
  bedrooms: 4,
  predictedPrice: 300000,
  confidence: 0.88,
  createdAt: new Date("2025-04-08T16:15:00.000Z"),
  ipAddress: null,
};

// Create a more reliable fetch mock setup
const setupFetchMockWithRefresh = () => {
  let fetchCount = 0;
  const mockResponses = {
    1: mockPredictionLogs,
    2: [...mockPredictionLogs, refreshedLog],
  };

  (global.fetch as jest.Mock).mockImplementation((url: string) => {
    if (url === "/api/predictions") {
      fetchCount++;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponses[fetchCount as 1 | 2] || []),
      });
    }
    return Promise.reject(new Error("Unexpected URL"));
  });

  return { getFetchCount: () => fetchCount };
};

// Setup mock for testing error case
const setupErrorFetchMock = () => {
  (global.fetch as jest.Mock).mockReset();
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: false,
    json: () =>
      Promise.resolve({
        code: "FETCH_ERROR",
        message: "Failed to fetch prediction history",
      }),
  });
};

// Setup mock for testing empty response
const setupEmptyFetchMock = () => {
  (global.fetch as jest.Mock).mockReset();
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve([]),
  });
};

// Setup mock that never resolves for loading state
const setupLoadingFetchMock = () => {
  (global.fetch as jest.Mock).mockReset();
  (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
};

const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
};

describe("PredictionHistory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state initially", async () => {
    // Setup mock that never resolves to ensure loading state stays visible
    setupLoadingFetchMock();

    renderWithQueryClient(<PredictionHistory />);

    expect(screen.getByText(/loading history/i)).toBeInTheDocument();
  });

  it("renders prediction history items when data is loaded", async () => {
    // Setup mock with successful response
    setupFetchMockWithRefresh();

    renderWithQueryClient(<PredictionHistory />);

    // Wait for data to be displayed
    await waitFor(() => {
      expect(screen.getByText("$250,000.00")).toBeInTheDocument();
    });

    // Additional checks
    expect(screen.getByText("$320,000.00")).toBeInTheDocument();
    expect(screen.getByText(/1500 sqft/)).toBeInTheDocument();
    expect(screen.getByText(/3 bed/)).toBeInTheDocument();
    expect(screen.getByText(/2000 sqft/)).toBeInTheDocument();
    expect(screen.getByText(/4 bed/)).toBeInTheDocument();
    expect(screen.getAllByText(/92/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/85/)[0]).toBeInTheDocument();
  });

  it("renders error state when fetch fails", async () => {
    // Setup mock with failure response
    setupErrorFetchMock();

    renderWithQueryClient(<PredictionHistory />);

    // Wait for error state to be displayed
    await waitFor(() => {
      expect(screen.getByText(/error loading history/i)).toBeInTheDocument();
    });
  });

  it("renders empty state when no predictions exist", async () => {
    // Setup mock with empty array response
    setupEmptyFetchMock();

    renderWithQueryClient(<PredictionHistory />);

    // Wait for empty state to be displayed
    await waitFor(() => {
      expect(
        screen.getByText(/no prediction history yet/i),
      ).toBeInTheDocument();
    });
  });

  it("refreshes data when refresh button is clicked", async () => {
    const user = userEvent.setup();
    const { getFetchCount } = setupFetchMockWithRefresh();

    // Render with QueryClient configured for test environment
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          refetchOnWindowFocus: false,
          refetchOnMount: false,
          // Use gcTime instead of cacheTime for v5+
          gcTime: 0,
          staleTime: 0,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <PredictionHistory />
      </QueryClientProvider>,
    );

    // Wait for initial data to load
    await waitFor(
      () => {
        expect(screen.getByText("$250,000.00")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    // Verify initial predictions are displayed
    expect(screen.getByText("$320,000.00")).toBeInTheDocument();
    expect(getFetchCount()).toBe(1);

    // Find and click refresh button
    const refreshButton = screen.getByTitle("Refresh history");
    await user.click(refreshButton);

    // Wait for and verify the new data appears
    await waitFor(
      () => {
        expect(screen.getByText("$300,000.00")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    // Verify fetch was called twice
    expect(getFetchCount()).toBe(2);

    // Verify all data is present after refresh
    expect(screen.getByText("$250,000.00")).toBeInTheDocument();
    expect(screen.getByText("$320,000.00")).toBeInTheDocument();
    expect(screen.getByText("$300,000.00")).toBeInTheDocument();

    // Verify other data points from the refreshed log
    expect(screen.getByText("1800 sqft")).toBeInTheDocument();
    expect(screen.getAllByText(/88%/)[0]).toBeInTheDocument();
  });
});

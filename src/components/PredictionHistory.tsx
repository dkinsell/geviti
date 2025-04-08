"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { PredictionLog } from "@prisma/client";
import { formatCurrency } from "@/lib/formatCurrency";

/**
 * Fetches the prediction history from the API.
 * @returns An array of prediction log entries.
 */
const fetchPredictionHistory = async (): Promise<PredictionLog[]> => {
  const response = await fetch("/api/predictions");

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.message || `HTTP error! status: ${response.status}`,
    );
  }

  return response.json();
};

/**
 * Displays a list of recent housing price predictions.
 * Fetches data using TanStack Query and handles loading/error states.
 */
export default function PredictionHistory() {
  const {
    data: history,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<PredictionLog[], Error>({
    queryKey: ["predictionHistory"],
    queryFn: fetchPredictionHistory,
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-700">
          Recent Predictions
        </h2>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh history"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <p className="text-center text-gray-500 py-4">Loading history...</p>
      )}

      {/* Error State */}
      {isError && (
        <div className="text-center py-4 px-3 bg-red-50 border border-red-200 rounded-md">
          <p className="font-semibold text-red-700">Error loading history</p>
          <p className="text-sm text-red-600 mt-1">{error?.message}</p>
        </div>
      )}

      {/* Success State (Data available) */}
      {history && history.length > 0 && (
        <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
          {history.map((log) => {
            const confidenceValue = log.confidence ?? 0;

            return (
              <li
                key={log.id}
                className="p-3 bg-gray-50 rounded-md border border-gray-200 text-sm"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-gray-800">
                    {formatCurrency(log.predictedPrice)}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      confidenceValue >= 0.85
                        ? "bg-green-100 text-green-700"
                        : confidenceValue >= 0.7
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {(confidenceValue * 100).toFixed(0)}% Conf.
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  <span>{log.squareFootage} sqft</span>
                  <span className="mx-1">|</span>
                  <span>{log.bedrooms} bed</span>
                  <span className="mx-1">|</span>
                  <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Empty State */}
      {history && history.length === 0 && !isLoading && !isError && (
        <p className="text-center text-gray-500 py-4">
          No prediction history yet.
        </p>
      )}
    </div>
  );
}

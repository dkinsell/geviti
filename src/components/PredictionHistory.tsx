"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { PredictionLog } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { formatCurrency } from "@/lib/formatCurrency";
import {
  RefreshCw,
  Home,
  Clock,
  BarChart2,
  Loader2,
  BedDouble,
} from "lucide-react";

function decimalToNumber(decimal: Prisma.Decimal | number | null): number {
  if (decimal === null) return 0;
  if (typeof decimal === "number") return decimal;
  return parseFloat(decimal.toString());
}

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
    <div className="rounded-lg bg-gradient-to-r from-indigo-400 via-purple-500 to-pink-500 p-1 shadow-lg">
      <div className="bg-white rounded-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-700 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-500" />
            Recent Predictions
          </h2>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            title="Refresh history"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
            <p className="text-gray-500">Loading prediction history...</p>
          </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-80 overflow-y-auto pr-2">
            {history.map((log) => {
              const confidenceValue = log.confidence ?? 0;

              return (
                <div
                  key={log.id}
                  className="p-4 bg-gray-50 rounded-md border border-gray-200 hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-800 text-lg">
                      {formatCurrency(decimalToNumber(log.predictedPrice))}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 ${
                        decimalToNumber(confidenceValue) >= 0.85
                          ? "bg-green-100 text-green-700"
                          : decimalToNumber(confidenceValue) >= 0.7
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      <BarChart2 className="w-3 h-3" />
                      {(decimalToNumber(confidenceValue) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Home className="w-3 h-3" />
                      <span>{log.squareFootage} sqft</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <BedDouble className="w-3 h-3" />
                      <span>{log.bedrooms} bed</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {history && history.length === 0 && !isLoading && !isError && (
          <div className="text-center py-8 bg-gray-50 rounded-md">
            <Home className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No prediction history yet.</p>
            <p className="text-sm text-gray-400 mt-1">
              Make your first prediction to see results here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

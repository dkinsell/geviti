"use client";

import React from "react";
import { formatCurrency } from "@/lib/formatCurrency";
import { usePrediction } from "@/components/providers/PredictionProvider";

/**
 * Displays the result of a housing price prediction, including loading and error states.
 */
export default function PredictionResultDisplay() {
  const {
    predictionResult: result,
    isLoading,
    predictionError: error,
  } = usePrediction();

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="text-center py-4 w-full">
        <p className="text-lg text-blue-600 animate-pulse">
          Calculating prediction...
        </p>
      </div>
    );
  }

  // 2. Error State
  if (error) {
    return (
      <div className="text-center py-4 px-3 bg-red-50 border border-red-200 rounded-md w-full">
        <p className="text-lg font-semibold text-red-700">Prediction Error</p>
        <p className="text-sm text-red-600 mt-1">{error.message}</p>
      </div>
    );
  }

  // 3. Success State (Result available)
  if (result) {
    const confidencePercentage = (result.confidence * 100).toFixed(1);
    let confidenceColor = "text-green-600";
    if (result.confidence < 0.85 && result.confidence >= 0.7) {
      confidenceColor = "text-yellow-600";
    } else if (result.confidence < 0.7) {
      confidenceColor = "text-orange-600";
    }

    return (
      <div className="text-center py-4 px-3 bg-green-50 border border-green-200 rounded-md w-full">
        <p className="text-sm text-gray-600 mb-1">Predicted Price:</p>
        <p className="text-3xl font-bold text-green-700 mb-2">
          {formatCurrency(result.price)}
        </p>
        <p className={`text-sm font-medium ${confidenceColor}`}>
          Confidence: {confidencePercentage}%
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Predicted on: {new Date(result.timestamp).toLocaleString()}
        </p>
      </div>
    );
  }

  // 4. Initial/Idle State (No result, no loading, no error)
  return (
    <div className="text-center py-4 w-full">
      <p className="text-gray-500">
        Enter the house details above to get a price prediction.
      </p>
    </div>
  );
}

"use client";

import React from "react";
import { formatCurrency } from "@/lib/formatCurrency";
import { usePrediction } from "@/components/providers/PredictionProvider";
import { DollarSign, BarChart2, Loader2 } from "lucide-react";

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
      <div className="rounded-lg bg-gradient-to-r from-blue-400 to-indigo-500 p-1 shadow-lg h-full">
        <div className="bg-white rounded-md p-6 h-full flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          <p className="text-lg text-blue-600">Calculating prediction...</p>
        </div>
      </div>
    );
  }

  // 2. Error State
  if (error) {
    return (
      <div className="rounded-lg bg-gradient-to-r from-red-400 to-pink-500 p-1 shadow-lg h-full">
        <div className="bg-white rounded-md p-6 h-full">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">
            Prediction Error
          </h2>
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-700 mb-2">Unable to calculate prediction</p>
            <p className="text-sm text-red-600">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  // 3. Success State (Result available)
  if (result) {
    const confidencePercentage = (result.confidence * 100).toFixed(1);
    let confidenceColor = "text-green-600";
    let confidenceBg = "bg-green-100";

    if (result.confidence < 0.85 && result.confidence >= 0.7) {
      confidenceColor = "text-yellow-600";
      confidenceBg = "bg-yellow-100";
    } else if (result.confidence < 0.7) {
      confidenceColor = "text-orange-600";
      confidenceBg = "bg-orange-100";
    }

    return (
      <div className="rounded-lg bg-gradient-to-r from-green-400 to-emerald-500 p-1 shadow-lg h-full">
        <div className="bg-white rounded-md p-6 h-full">
          <h2 className="text-xl font-semibold mb-6 text-gray-700 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            Prediction Result
          </h2>

          <div className="text-center py-6">
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-1">Predicted Price:</p>
              <p className="text-4xl font-bold text-green-700">
                {formatCurrency(result.price)}
              </p>
            </div>

            <div className="flex justify-center mb-4">
              <div
                className={`${confidenceBg} ${confidenceColor} rounded-full px-4 py-1 flex items-center gap-2`}
              >
                <BarChart2 className="w-4 h-4" />
                <span className="font-semibold">
                  {confidencePercentage}% Confidence
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Predicted on: {new Date(result.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 4. Initial/Idle State (No result, no loading, no error)
  return (
    <div className="rounded-lg bg-gradient-to-r from-gray-200 to-gray-300 p-1 shadow-lg h-full">
      <div className="bg-white rounded-md p-6 h-full flex flex-col items-center justify-center">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">
          Get a Price Prediction
        </h2>
        <p className="text-gray-500 text-center">
          Enter property details in the form to calculate an estimated home
          price.
        </p>
      </div>
    </div>
  );
}

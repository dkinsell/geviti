"use client";

import React from "react";
import PredictionForm from "@/components/PredictionForm";
import PredictionResultDisplay from "@/components/PredictionResultDisplay";
import PredictionHistory from "@/components/PredictionHistory";
import { PredictionProvider } from "@/components/providers/PredictionProvider";

/**
 * Main page component for the Housing Price Prediction application.
 * Renders the prediction form, results display, and prediction history.
 */
export default function HomePage() {
  return (
    <PredictionProvider>
      <main className="container mx-auto p-4 md:p-8 max-w-3xl">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          Housing Price Predictor
        </h1>

        <div className="bg-white shadow-md rounded-lg p-6 mb-8">
          <PredictionForm />
        </div>

        <div className="bg-white shadow-md rounded-lg p-6 mb-8 min-h-[100px] flex items-center justify-center">
          <PredictionResultDisplay />
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          <PredictionHistory />
        </div>
      </main>
    </PredictionProvider>
  );
}

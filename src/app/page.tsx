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
      <main className="container mx-auto p-4 md:p-8 flex-grow">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          <div className="md:col-span-2">
            <PredictionForm />
          </div>

          <div className="md:col-span-3">
            <PredictionResultDisplay />
          </div>

          <div className="md:col-span-5">
            <PredictionHistory />
          </div>
        </div>
      </main>
    </PredictionProvider>
  );
}

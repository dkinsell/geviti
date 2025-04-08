"use client";

import React, { createContext, useState, useContext, ReactNode } from "react";
import { PredictionResult } from "@/types/PredictionTypes";

interface PredictionContextType {
  predictionResult: PredictionResult | null;
  setPredictionResult: (result: PredictionResult | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  predictionError: Error | null;
  setPredictionError: (error: Error | null) => void;
}

const PredictionContext = createContext<PredictionContextType | undefined>(
  undefined,
);

/**
 * Provider component for sharing prediction state across the application
 */
export function PredictionProvider({ children }: { children: ReactNode }) {
  const [predictionResult, setPredictionResult] =
    useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [predictionError, setPredictionError] = useState<Error | null>(null);

  return (
    <PredictionContext.Provider
      value={{
        predictionResult,
        setPredictionResult,
        isLoading,
        setIsLoading,
        predictionError,
        setPredictionError,
      }}
    >
      {children}
    </PredictionContext.Provider>
  );
}

/**
 * Hook for accessing prediction state throughout the application
 */
export function usePrediction() {
  const context = useContext(PredictionContext);
  if (context === undefined) {
    throw new Error("usePrediction must be used within a PredictionProvider");
  }
  return context;
}

"use client";

import React, { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  predictionInputSchema,
  PredictionInputSchema,
} from "@/lib/validations/predictionSchema";
import { PredictionResult } from "@/types/PredictionTypes";
import { usePrediction } from "@/components/providers/PredictionProvider";
import {
  Square,
  BedDouble,
  CalculatorIcon,
  RotateCcw,
  Home,
  InfoIcon,
  Clock,
} from "lucide-react";

const RECENT_INPUTS_KEY = "recentPredictionInputs";
const MAX_RECENT_INPUTS = 5;

type RecentInput = {
  id: string;
  timestamp: number;
  squareFootage: number;
  bedrooms: number;
};

/**
 * Fetches a prediction from the API.
 * @param data - The input data for the prediction.
 * @returns The prediction result.
 */
const postPrediction = async (
  data: PredictionInputSchema,
): Promise<PredictionResult> => {
  const response = await fetch("/api/predict", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.message || `HTTP error! status: ${response.status}`,
    );
  }

  return response.json();
};

/**
 * Renders a form for users to input housing features and get a price prediction.
 * Handles form validation and submission using React Hook Form and TanStack Query.
 */
export default function PredictionForm() {
  const { setPredictionResult, setIsLoading, setPredictionError } =
    usePrediction();

  const [recentInputs, setRecentInputs] = useState<RecentInput[]>([]);
  const [showRecentInputs, setShowRecentInputs] = useState(false);

  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<PredictionInputSchema>({
    resolver: zodResolver(predictionInputSchema),
    defaultValues: {},
  });

  useEffect(() => {
    const savedInputs = localStorage.getItem(RECENT_INPUTS_KEY);
    if (savedInputs) {
      try {
        const parsedInputs = JSON.parse(savedInputs) as RecentInput[];
        setRecentInputs(parsedInputs);

        if (parsedInputs.length > 0) {
          const mostRecent = parsedInputs[0];
          setValue("squareFootage", mostRecent.squareFootage);
          setValue("bedrooms", mostRecent.bedrooms);
        }
      } catch (e) {
        console.error("Failed to parse recent inputs:", e);
      }
    }
  }, [setValue]);

  const saveToRecentInputs = (data: PredictionInputSchema) => {
    const newInput: RecentInput = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      squareFootage: Number(data.squareFootage),
      bedrooms: Number(data.bedrooms),
    };

    const updatedInputs = [
      newInput,
      ...recentInputs.filter(
        (input) =>
          input.squareFootage !== newInput.squareFootage ||
          input.bedrooms !== newInput.bedrooms,
      ),
    ].slice(0, MAX_RECENT_INPUTS);

    setRecentInputs(updatedInputs);
    localStorage.setItem(RECENT_INPUTS_KEY, JSON.stringify(updatedInputs));
  };

  const applyRecentInput = (input: RecentInput) => {
    setValue("squareFootage", input.squareFootage);
    setValue("bedrooms", input.bedrooms);
    setShowRecentInputs(false);
  };

  const handleReset = () => {
    reset({
      squareFootage: undefined,
      bedrooms: undefined,
    });
  };

  const mutation = useMutation<PredictionResult, Error, PredictionInputSchema>({
    mutationFn: postPrediction,
    onSuccess: (data) => {
      console.log("Prediction successful, data received:", data);
      setPredictionResult(data);
      setIsLoading(false);
      setPredictionError(null);

      queryClient.invalidateQueries({ queryKey: ["predictionHistory"] });
    },
    onError: (error) => {
      console.error("Prediction failed:", error);
      setPredictionError(error);
      setIsLoading(false);
      setPredictionResult(null);
    },
    onMutate: () => {
      setIsLoading(true);
      setPredictionError(null);
    },
  });

  const onSubmit: SubmitHandler<PredictionInputSchema> = (data) => {
    const numericData = {
      squareFootage: Number(data.squareFootage),
      bedrooms: Number(data.bedrooms),
    };
    saveToRecentInputs(data);
    mutation.mutate(numericData);
  };

  return (
    <div className="rounded-lg bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 p-1 shadow-lg">
      <div className="bg-white rounded-md p-6 h-full">
        <h2 className="text-xl font-semibold mb-6 text-gray-700">
          Property Details
        </h2>

        {/* Recent inputs dropdown */}
        {recentInputs.length > 0 && (
          <div className="mb-6 relative">
            <button
              type="button"
              onClick={() => setShowRecentInputs(!showRecentInputs)}
              className="w-full flex justify-between items-center py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" />
                <span>Recent Predictions</span>
              </div>
              <span>{showRecentInputs ? "▲" : "▼"}</span>
            </button>

            {showRecentInputs && (
              <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-auto">
                {recentInputs.map((input) => (
                  <button
                    key={input.id}
                    type="button"
                    onClick={() => applyRecentInput(input)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 flex justify-between items-center"
                  >
                    <span>
                      {input.squareFootage} sqft, {input.bedrooms} bed
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(input.timestamp).toLocaleTimeString()}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label
              htmlFor="squareFootage"
              className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"
            >
              <Square className="w-4 h-4 text-indigo-500" />
              Square Footage (sqft)
            </label>
            <input
              id="squareFootage"
              type="number"
              {...register("squareFootage", { valueAsNumber: true })}
              className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                errors.squareFootage ? "border-red-500" : ""
              }`}
              placeholder="e.g., 1500"
            />
            <div className="mt-1 flex items-center gap-1">
              <InfoIcon className="w-3 h-3 text-gray-500" />
              <p className="text-xs text-gray-500">
                Recommended range: 800-2600 sqft (training data range)
              </p>
            </div>
            {errors.squareFootage && (
              <p className="mt-1 text-sm text-red-600">
                {errors.squareFootage.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="bedrooms"
              className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"
            >
              <BedDouble className="w-4 h-4 text-indigo-500" />
              Number of Bedrooms
            </label>
            <input
              id="bedrooms"
              type="number"
              step="1"
              {...register("bedrooms", { valueAsNumber: true })}
              className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                errors.bedrooms ? "border-red-500" : ""
              }`}
              placeholder="e.g., 3"
            />
            <div className="mt-1 flex items-center gap-1">
              <InfoIcon className="w-3 h-3 text-gray-500" />
              <p className="text-xs text-gray-500">
                Recommended range: 2-5 bedrooms (training data range)
              </p>
            </div>
            {errors.bedrooms && (
              <p className="mt-1 text-sm text-red-600">
                {errors.bedrooms.message}
              </p>
            )}
          </div>

          <div className="opacity-60">
            <label
              htmlFor="propertyType"
              className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"
            >
              <Home className="w-4 h-4 text-indigo-500" />
              Property Type
              <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-0.5 rounded-full ml-auto">
                Coming Soon
              </span>
            </label>
            <select
              id="propertyType"
              disabled
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm cursor-not-allowed"
            >
              <option value="">Select property type</option>
              <option value="single-family">Single Family Home</option>
              <option value="condo">Condominium</option>
              <option value="townhouse">Townhouse</option>
              <option value="multi-family">Multi-Family</option>
            </select>
            <p className="mt-1 text-xs text-gray-500 italic">
              This feature will be available in a future update.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="flex justify-center items-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 gap-2 w-1/3"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed gap-2 items-center"
            >
              <CalculatorIcon className="w-4 h-4" />
              {mutation.isPending ? "Predicting..." : "Predict Price"}
            </button>
          </div>

          {mutation.isError && (
            <p className="mt-2 text-sm text-red-600 text-center">
              Prediction failed:{" "}
              {mutation.error?.message || "An unknown error occurred"}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  predictionInputSchema,
  PredictionInputSchema,
} from "@/lib/validations/predictionSchema";
import { PredictionResult } from "@/types/PredictionTypes";
import { usePrediction } from "@/components/providers/PredictionProvider";
import { Square, BedDouble, CalculatorIcon } from "lucide-react";

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

  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PredictionInputSchema>({
    resolver: zodResolver(predictionInputSchema),
    defaultValues: {},
  });

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
    mutation.mutate(numericData);
  };

  return (
    <div className="rounded-lg bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 p-1 shadow-lg">
      <div className="bg-white rounded-md p-6 h-full">
        <h2 className="text-xl font-semibold mb-6 text-gray-700">
          Property Details
        </h2>
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
            {errors.bedrooms && (
              <p className="mt-1 text-sm text-red-600">
                {errors.bedrooms.message}
              </p>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed gap-2 items-center"
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

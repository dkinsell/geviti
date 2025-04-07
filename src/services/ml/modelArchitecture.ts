import * as tf from "@tensorflow/tfjs-node";

/**
 * Creates and compiles a neural network model for housing price prediction
 *
 * Architecture:
 * - Input: 2 features (square footage, bedrooms)
 * - Hidden Layer 1: 8 units, ReLU activation
 * - Hidden Layer 2: 4 units, ReLU activation
 * - Output: 1 unit (price prediction)
 */
export function createModel(): tf.LayersModel {
  const model = tf.sequential();

  // First hidden layer
  model.add(
    tf.layers.dense({
      inputShape: [2],
      units: 8,
      activation: "relu",
      kernelInitializer: "heNormal",
    }),
  );

  // Second hidden layer
  model.add(
    tf.layers.dense({
      units: 4,
      activation: "relu",
      kernelInitializer: "heNormal",
    }),
  );

  // Output layer
  model.add(
    tf.layers.dense({
      units: 1,
      kernelInitializer: "heNormal",
    }),
  );

  // Compile model with mean squared error loss and Adam optimizer
  model.compile({
    loss: "meanSquaredError",
    optimizer: tf.train.adam(0.01),
    metrics: ["mse"],
  });

  return model;
}

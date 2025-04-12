# Machine Learning Model Details

This document provides details about the machine learning model used in the Geviti application for predicting housing prices.

## 1. Overview

- **Purpose:** Predict the price of a house based on its square footage and number of bedrooms.
- **Type:** Regression model.
- **Library:** TensorFlow.js.

## 2. Data

### Source

- The model is trained using data stored in the `TrainingData` table in the database.
- This table is populated by the seed script ([`prisma/seed.ts`](/Users/dylankinsella/geviti/prisma/seed.ts)) using a small, predefined dataset.
- **Training Data Range (from seed data):**
  - Square Footage: 800 - 2600 sqft
  - Bedrooms: 2 - 5
  - Price: $150,000 - $400,000

### Features & Target

- **Input Features:**
  1.  `squareFootage` (number)
  2.  `bedrooms` (number)
- **Target Variable:**
  1.  `price` (number)

## 3. Preprocessing

- **Normalization:** Min-Max scaling is applied to both input features (`squareFootage`, `bedrooms`) and the target variable (`price`) before training.
  - Each feature/target value `x` is transformed to `(x - min) / (max - min)`, scaling it to the range [0, 1].
  - This helps the neural network converge faster and perform better by ensuring all inputs are on a similar scale.
- **Parameters:** The minimum (`min`) and maximum (`max`) values for each variable, calculated from the training data, are stored in `normalization.json`. These are required to normalize new input data during prediction and to denormalize the model's output back to the original price scale.

## 4. Model Architecture

- **Type:** Sequential Dense Neural Network built with TensorFlow.js Layers API.
- **Layers:**
  1. **Input Layer:** Implicitly defined by the input shape (2 features).
  2. **Hidden Layer 1:** Dense layer with 8 units and ReLU activation function.
  3. **Hidden Layer 2:** Dense layer with 4 units and ReLU activation function.
  4. **Output Layer:** Dense layer with 1 unit (predicting the single price value) and a linear activation function.
- **Initialization:** He normal initialization for all layers.
- **Optimizer:** Adam optimizer with learning rate 0.01.

_Note: This architecture provides a balance between complexity and the ability to model non-linear relationships in the small dataset._

## 5. Training

- **Process:** The model is trained using the `trainModel` function in [`src/services/ml/trainer.ts`](/Users/dylankinsella/geviti/src/services/ml/trainer.ts).
- **Trigger:** Training occurs during:
  - The Vercel build process via the `pre-build-train` script ([`scripts/preBuildTrain.ts`](/Users/dylankinsella/geviti/scripts/preBuildTrain.ts)).
  - Local database seeding via `npm run seed:dev` (if model files don't already exist).
- **Optimizer:** Adam optimizer with learning rate 0.01.
- **Loss Function:** Mean Squared Error (MSE), suitable for regression tasks.
- **Hyperparameters (defined in `pre-build-train`):**
  - Epochs: 200
  - Batch Size: 4
- **Data Source:** Training data is fetched from the database (SQLite locally, Neon in production build).

## 6. Persistence & Loading

- **Artifacts:** The trained model consists of:
  - `model.json`: Model architecture definition.
  - `model.weights.bin`: Trained model weights.
  - `normalization.json`: Min/Max values used for normalization.
- **Storage:**
  - **Local:** Saved to the `public/model/` directory.
  - **Production (Vercel):** Uploaded to Vercel Blob during the build process.
- **Mechanism:** Handled by the `saveModel` and `loadModel` functions in [`src/services/ml/persistence.ts`](/Users/dylankinsella/geviti/src/services/ml/persistence.ts), which adapt based on the environment (local filesystem vs. Vercel Blob).

## 7. Prediction Flow

1.  User inputs `squareFootage` and `bedrooms` via the API (`/api/predict`).
2.  The `loadModel` function retrieves the model architecture, weights, and normalization parameters.
3.  Input features are normalized using the loaded `min`/`max` values from `normalization.json`.
4.  The normalized inputs are fed into the loaded TensorFlow.js model.
5.  The model outputs a normalized predicted price.
6.  This output is denormalized using the loaded `min`/`max` price values to get the final predicted price.
7.  A confidence score is calculated (see below).
8.  The predicted price and confidence score are returned.

## 8. Confidence Score

- **Purpose:** To provide an indication of how reliable the prediction might be, given the limited training data.
- **Calculation:** Implemented in [`src/services/ml/predictor.ts`](/Users/dylankinsella/geviti/src/services/ml/predictor.ts) using the `calculateRangeConfidence` function:
  - For inputs within training range:
    - Score between 0.8-1.0
    - Highest (1.0) at the midpoint of the range
    - Decreases linearly toward edges of range (0.8)
  - For inputs outside training range:
    - Starts at 0.8 and decreases based on distance from range
    - Minimum score of 0.5
    - Distance is normalized by the range size
  - Final confidence is average of square footage and bedrooms confidence scores

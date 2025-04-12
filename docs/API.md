# Geviti API Documentation

This document details the REST API endpoints provided by the Geviti application.

## Base URL

All API endpoints are relative to `/api`.

---

## 1. Get Price Prediction

Makes a prediction based on input features.

- **Endpoint:** `POST /api/predict`
- **Description:** Submits housing features (square footage, bedrooms) to get a predicted price and confidence score. Logs the prediction input and result.
- **Request Body:**
  ```json
  {
    "squareFootage": number,
    "bedrooms": number
  }
  ```
  - `squareFootage`: Positive number (e.g., `1500`). Validation: `> 0`, `<= 10000`.
  - `bedrooms`: Positive integer (e.g., `3`). Validation: `>= 1`, `<= 10`.
- **Success Response (200 OK):**
  ```json
  {
    "price": number, // Predicted price (e.g., 255000.50)
    "confidence": number, // Confidence score (0-1, e.g., 0.85)
    "timestamp": string // ISO 8601 timestamp of the prediction
  }
  ```
- **Error Responses:**
  - **400 Bad Request:** Input validation failed.
    ```json
    {
      "code": "VALIDATION_ERROR",
      "message": "Invalid input data",
      // Details object contains validation errors, often mapping field names to error messages
      "details": {
        "squareFootage": ["Expected number, received string"] // Example structure
      }
    }
    ```
  - **500 Internal Server Error:** Model not loaded or other server issue.
    ```json
    {
      "code": "ML_INIT_ERROR",
      "message": "Machine learning service failed to initialize.",
      "details": "Specific error message from initialization"
    }
    ```
    ```json
    {
      "code": "PREDICTION_ERROR",
      "message": "Failed to process prediction",
      "details": "Specific error message from prediction process"
    }
    ```
    ```json
    {
      "code": "DATABASE_ERROR",
      "message": "Failed to log prediction."
      // Optional details might be included here
    }
    ```

---

## 2. Get Prediction History

Retrieves the most recent prediction history.

- **Endpoint:** `GET /api/predictions`
- **Description:** Fetches the 10 most recent prediction log entries, ordered by timestamp descending. _Note: Pagination (`limit`, `offset`) is not currently implemented._
- **Query Parameters:** None currently supported.
- **Success Response (200 OK):**
  ```json
  [
    {
      "id": string, // Unique ID of the prediction log entry
      "squareFootage": number,
      "bedrooms": number,
      "predictedPrice": number,
      "confidence": number,
      "createdAt": string // ISO 8601 timestamp
    }
    // ... up to 10 predictions
  ]
  ```
  _Note: The response is an array directly, not nested within an object._
- **Error Responses:**
  - **500 Internal Server Error:** Database query failed.
    ```json
    {
      "code": "DATABASE_ERROR",
      "message": "Failed to fetch prediction history."
    }
    ```

---

_Note: Optional endpoints like `POST /api/model/retrain` or `GET /api/ml-status` are primarily for development/testing and are not considered part of the current API._

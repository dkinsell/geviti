# Geviti: Housing Price Prediction App

A full-stack web application that predicts housing prices using machine learning, built with Next.js, TypeScript, and TensorFlow.js.

## Features

- 🏠 Real-time housing price predictions based on square footage and bedrooms
- 📊 Machine learning model trained on local market data
- 📈 Confidence scores for each prediction
- 📱 Responsive design that works on desktop and mobile
- 🔄 Historical prediction tracking
- 💾 Recent inputs memory for quick re-use

## Tech Stack

- **Frontend:** [Next.js 14](https://nextjs.org/) with [TypeScript](https://www.typescriptlang.org/) and [React 18](https://react.dev/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) for modern, responsive design
- **Backend:** Next.js API Routes with TypeScript
- **Database:** [SQLite](https://www.sqlite.org/) with [Prisma ORM](https://www.prisma.io/)
- **ML:** [TensorFlow.js](https://www.tensorflow.org/js) for machine learning
- **State Management:** [TanStack Query](https://tanstack.com/query) & Context API
- **Form Handling:** [React Hook Form](https://react-hook-form.com/) with [Zod](https://zod.dev/) validation
- **Testing:** [Jest](https://jestjs.io/) and [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database connection string for SQLite
DATABASE_URL="file:./dev.db"

# ML model file location (optional, defaults to public/model/model.json)
ML_MODEL_PATH="./public/model/model.json"
```

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/geviti.git
cd geviti
```

2. Install dependencies:

```bash
npm install
```

3. Set up the database:

```bash
npx prisma generate
npx prisma db push
```

4. Start the development server:

```bash
npm run dev
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch
```

## Project Structure

```
geviti/
├── src/
│   ├── app/              # Next.js app router pages
│   │   └── api/         # API routes
│   │       ├── predict/     # Price prediction endpoint
│   │       ├── predictions/ # History endpoint
│   │       └── model/       # Model management endpoints
│   ├── components/       # React components
│   │   ├── providers/   # Context providers
│   │   └── layout/         # Shared UI components
│   ├── lib/             # Utility functions
│   │   └── validations/ # Zod validation schemas
│   ├── services/        # Business logic
│   │   └── ml/         # Machine learning services
│   └── types/           # TypeScript types
├── prisma/              # Database schema
└── tests/              # Test files
    └── integration/    # Integration tests
```

## API Documentation

### POST /api/predict

Makes a new price prediction.

**Request Body:**

```json
{
  "squareFootage": number, // Range: 800-2600
  "bedrooms": number      // Range: 2-5
}
```

**Success Response:**

```json
{
  "price": number,        // Predicted price in USD
  "confidence": number,   // Range: 0-1
  "timestamp": string    // ISO date string
}
```

**Error Responses:**

Status: 400 Bad Request

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Invalid input data",
  "details": object
}
```

Status: 500 Internal Server Error

```json
{
  "code": "INTERNAL_ERROR",
  "message": "Failed to process prediction"
}
```

### GET /api/predictions

Retrieves recent prediction history.

**Success Response:**

Status: 200 OK

```json
[
  {
    "id": number,
    "squareFootage": number,
    "bedrooms": number,
    "predictedPrice": number,
    "confidence": number,    // Range: 0-1
    "createdAt": string,    // ISO date string
    "ipAddress": string | null
  }
]
```

**Error Response:**

Status: 500 Internal Server Error

```json
{
  "code": "INTERNAL_ERROR",
  "message": "Failed to fetch prediction history"
}
```

## ML Model Information

- Training data range:
  - Square footage: 800-2600 sqft
  - Bedrooms: 2-5
  - Price range: $150,000-$400,000
- Features: Square footage, number of bedrooms
- Model architecture: Dense neural network
- Confidence scoring: Based on input proximity to training data range

## Testing Strategy

- Unit tests for core functionality
- Integration tests for API endpoints
- UI component tests with React Testing Library
- End-to-end prediction flow tests

## Architecture Decisions

### Why Next.js?

- Server-side rendering capabilities
- API routes for backend functionality
- Built-in TypeScript support
- Modern React features with App Router

### Why SQLite?

- Simple setup and maintenance
- Excellent for development and small to medium deployments
- No separate database server required
- Prisma ORM for type-safe database access

### Why TensorFlow.js?

- Client-side prediction capabilities
- No need for separate ML server
- Easy model serialization and loading
- Good performance for simple regression models

## Development Commands

```bash
# Start development server
npm run dev

# Run tests
npm test

# Run type checking
npm run type-check

# Format code
npm run format

# Lint code
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

## Troubleshooting

### Common Issues

1. **Database Connection**

   ```
   Error: P1001: Can't reach database server
   ```

   - Check that SQLite file exists
   - Verify DATABASE_URL in .env
   - Ensure Prisma schema is synced

2. **Model Loading**

   ```
   Error: Failed to fetch model.json
   ```

   - Verify ML_MODEL_PATH in .env
   - Check model files exist in public/model/
   - Clear browser cache

3. **Build Errors**
   - Run `npm run type-check` to find type issues
   - Ensure all dependencies are installed
   - Clear next.js cache with `npm run dev -- --clear`

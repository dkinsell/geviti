# Architecture Decisions

This document outlines the architectural choices and design patterns employed in the Geviti housing price prediction application.

## Core Technologies

### 1. Framework: Next.js 14+ (App Router)

- **Rationale:** Chosen for its integrated full-stack capabilities (App Router for server components, API routes), simplifying the structure by keeping frontend, backend, and API logic within one project. Its seamless Vercel integration streamlines deployment.

### 2. Language: TypeScript

- **Rationale:** Selected to improve code quality and maintainability through static typing, crucial for managing complexity between the UI, API, database (via Prisma), and ML logic.

### 3. Frontend Library: React 18+

- **Rationale:** Used as the UI library within Next.js, leveraging its component model for building the prediction form, results display, and history components.

### 4. Styling: Tailwind CSS

- **Rationale:** Adopted for rapid UI development using utility classes directly in components, ensuring design consistency across the application with minimal custom CSS.

### 5. Backend: Next.js API Routes

- **Rationale:** Utilized to handle backend logic (predictions, history fetching) within the Next.js framework, simplifying deployment and development by co-locating API endpoints with the frontend.

### 6. ORM: Prisma

- **Rationale:** Chosen for its type-safe database client, ensuring consistency between the database schema (SQLite/PostgreSQL) and TypeScript code. Its migration tool simplifies schema evolution.

### 7. Databases: SQLite (Development) & Neon PostgreSQL (Production)

- **Rationale:**
  - **SQLite:** Used locally for ease of setup (no separate server needed).
  - **Neon PostgreSQL:** Selected for production due to its serverless nature, scalability, and seamless integration with Vercel deployment workflows.

### 8. Machine Learning: TensorFlow.js

- **Rationale:** Enables ML model execution directly within the Node.js backend (API routes) and potentially the browser, eliminating the need for a separate Python ML service for this project's scope.

### 9. State Management: TanStack Query (React Query)

- **Rationale:**
  - Used for managing server state (predictions, history), providing automatic caching, background updates, and loading/error states.
  - _Note: Context API was considered but not implemented as all state is currently handled through React Query._

### 10. Form Handling: React Hook Form & Zod

- **Rationale:**
  - **React Hook Form:** Provides efficient form state management for the prediction input form.
  - **Zod:** Ensures data integrity through schema validation on both the client (form) and server (API), integrating well with TypeScript.

### 11. Deployment Platform: Vercel

- **Rationale:** Selected for its tight integration with Next.js, providing seamless deployments, serverless function hosting for API routes, and integrated services like Vercel Blob.

### 12. ML Model Storage: Vercel Blob

- **Rationale:** Selected for ML model artifact storage in production because:
  - Integrates directly with Vercel build process and runtime
  - Handles large binary files (model weights) efficiently
  - Provides CDN-backed URLs for fast model loading
  - Simplifies deployment by removing model files from git

## Key Architectural Patterns

### 1. ML Model Lifecycle

- **Training:**
  - Production: During Vercel build via `pre-build-train`
  - Development: During initial seeding via `seed:dev`
- **Storage:**
  - Production: Vercel Blob (uploaded during build)
  - Development: Local filesystem (`public/model/`)
- **Loading:**
  - Production: Custom TensorFlow.js IO handler fetches from Blob URLs
  - Development: Loads from filesystem, caches in IndexedDB

### 2. Database Schema Switching

- Maintains separate `schema.development.prisma` (SQLite) and `schema.production.prisma` (PostgreSQL) files.
- `scripts/switchDbSchema.ts` swaps the active `prisma/schema.prisma` based on the environment.
- NPM scripts automate this for relevant Prisma commands.

### 3. Environment Configuration

- `.env.local`: For local SQLite and optional dev Blob token.
- `.env.production`: For local simulation with Neon and production Blob token.
- Vercel Dashboard: Manages actual production secrets (Neon URL, Blob token).

### 4. Error Handling

- Zod schemas validate all API inputs and form submissions.
- API errors use standardized response format:
  ```typescript
  {
    code: "VALIDATION_ERROR" | "PREDICTION_ERROR" | "DATABASE_ERROR",
    message: string,
    details?: Record<string, unknown>
  }
  ```
- Try/catch blocks with custom error types wrap ML operations and database queries.
- React Query's built-in error states manage UI feedback.

### 5. Project Structure

```plaintext
geviti/
├── .github/                 # GitHub specific files (e.g., workflows, copilot instructions)
├── docs/                    # Project documentation (API, ARCHITECTURE, etc.)
├── prisma/                  # Database schemas, migrations, seed
│   ├── migrations/          # Prisma migration files
│   ├── schema.development.prisma
│   ├── schema.production.prisma
│   └── seed.ts
├── public/                  # Static assets
│   └── model/               # Local ML model files (dev fallback)
├── scripts/                 # Build and utility scripts (switchDbSchema, preBuildTrain)
├── src/
│   ├── app/                 # Next.js App Router (pages, layouts, API routes)
│   │   ├── api/             # API route handlers (predict, predictions)
│   │   │   ├── predict/
│   │   │   │   └── route.ts
│   │   │   └── predictions/
│   │   │       └── route.ts
│   │   ├── (pages)/         # Page components (using route groups)
│   │   │   └── page.tsx     # Main application page
│   │   ├── error.tsx        # App-level error boundary
│   │   ├── layout.tsx       # Root layout
│   │   └── loading.tsx      # Root loading UI
│   ├── components/          # Shared React components
│   │   ├── ui/              # Base UI components (e.g., Button, Input)
│   │   └── PredictionForm.tsx # Main prediction form component + related sub-components
│   ├── hooks/               # Custom React hooks (e.g., usePredictionHistory)
│   ├── lib/                 # Shared utilities, constants, config
│   │   └── zodSchemas.ts    # Zod validation schemas
│   ├── services/            # Business logic services
│   │   └── ml/              # ML service (persistence, predictor, trainer, modelArchitecture)
│   └── types/               # TypeScript type definitions
├── tests/                   # Unit and integration tests (Jest)
├── .env.local               # Local environment variables (dev)
├── .env.production          # Local environment variables (prod simulation)
├── .eslintrc.json           # ESLint configuration
├── .gitignore               # Git ignore rules
├── next.config.mjs          # Next.js configuration
├── package.json             # Project dependencies and scripts
├── postcss.config.js        # PostCSS configuration (for Tailwind)
├── tailwind.config.ts       # Tailwind CSS configuration
└── tsconfig.json            # TypeScript configuration
```

# Deployment Strategy and Configuration

This document describes how the Geviti housing price prediction application was deployed and configured on Vercel, utilizing Neon for the PostgreSQL database and Vercel Blob for machine learning model storage.

## Deployment Overview

The application is deployed on Vercel, leveraging its platform features for hosting, builds, and serverless functions. The production deployment utilizes:

- **Hosting Platform:** Vercel, integrated with the project's Git repository for continuous deployment.
- **Production Database:** A serverless PostgreSQL database hosted on Neon.
- **ML Model Storage:** Vercel Blob, used to store the TensorFlow.js model artifacts generated during the build.
- **Build Process:** A custom Vercel build process (`npm run vercel-build`) handles database schema switching, seeding (including ML training data fetch), ML model training, model upload to Vercel Blob, and the final Next.js application build.

## Vercel Project Configuration

- The project was imported into Vercel from its Git repository.
- Vercel automatically detected the Next.js framework.
- Standard Next.js build settings were used, with the `Build Command` effectively utilizing the `npm run vercel-build` script defined in [`package.json`](/Users/dylankinsella/geviti/package.json) to incorporate the necessary pre-build steps.

## Environment Variables Configuration (Vercel)

The following environment variables were configured in Vercel's project settings:

- **`DATABASE_URL`**:

  - **Value:** Neon PostgreSQL connection string
  - **Used During:** Build (seeding/training) and Runtime (predictions/history)
  - **Required For:** Database connections in both build and runtime environments

- **`BLOB_READ_WRITE_TOKEN`**:
  - **Value:** Vercel Blob store read/write token
  - **Used During:** Build (model upload) and Runtime (model loading)
  - **Required For:** Uploading trained model during build and loading model for predictions

## Build Process (`vercel-build`)

The `vercel-build` script orchestrates the production build sequence on Vercel:

1. **`db:prod`**: Switches to production schema and applies schema to Neon database.
2. **`mkdir -p /tmp/model`**: Creates temporary directory for model artifacts during build.
3. **`prisma db seed`**: Seeds the Neon database with training data (using `.env.production` context).
4. **`pre-build-train`**: Trains model using the seeded data, then uploads to Vercel Blob.
5. **`npm run build`**: Builds the Next.js application.

```bash
# Actual vercel-build script from package.json
"vercel-build": "npm run db:prod && mkdir -p /tmp/model && dotenv -e .env.production -- prisma db seed && dotenv -e .env.production -- npm run pre-build-train && npm run build"
```

## Database Integration (Neon)

- The production application connects to the Neon database specified by the `DATABASE_URL`.
- Schema management is handled by Prisma, with `prisma db push` applying the schema during the build process.

## ML Model Integration (Vercel Blob)

- The ML model is trained during each deployment build using the latest data from the production database.
- Three artifacts are stored in Vercel Blob:
  - `model.json`: Model architecture and metadata
  - `model.weights.bin`: Trained model weights
  - `normalization.json`: Feature normalization parameters
- The [`saveModel`](/Users/dylankinsella/geviti/src/services/ml/persistence.ts) function uploads these files when `IS_VERCEL=true`.
- At runtime, the [`loadModel`](/Users/dylankinsella/geviti/src/services/ml/persistence.ts) function:
  1. Detects Vercel environment
  2. Constructs Blob URLs for each artifact
  3. Uses a custom TensorFlow.js IO handler to load the model directly from Blob storage
  4. Caches the model in memory for subsequent predictions

## Deployment Troubleshooting Insights

During deployment setup, we addressed several potential issues:

1. **Build Process:**

   - Ensuring correct schema switching before database operations
   - Creating `/tmp/model` directory for temporary model storage
   - Using `dotenv-cli` to properly load `.env.production`
   - Verifying build command execution order

2. **Database (Neon):**

   - Confirming Prisma can connect during both build and runtime
   - Ensuring successful schema push and seeding
   - Verifying data availability for model training

3. **Model Training/Storage:**

   - Validating model training completes during build
   - Confirming successful Blob uploads
   - Testing model loading from Blob URLs
   - Verifying model caching behavior

4. **Environment Variables:**
   - Testing variable availability in different build steps
   - Verifying Blob token permissions
   - Ensuring proper URL format for Neon connection

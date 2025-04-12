# Local Development Setup Guide

This guide provides detailed instructions for setting up and managing the local development environment for the Geviti housing price prediction application.

## Prerequisites

- Node.js 18+
- npm 9+
- Git

_Note: SQLite is used automatically for local development; no separate installation is typically required as Prisma manages the file._

## Initial Setup

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/yourusername/geviti.git
    cd geviti
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Set up environment files:**
    Create two environment files in the project root: `.env.local` for development and `.env.production` for simulating production locally.

    ```bash
    # Copy example environment file if it exists, otherwise create manually
    # cp .env.example .env.local
    touch .env.local

    # Create a production env file (you'll need to add your Neon URL)
    touch .env.production
    ```

    Populate these files according to the **Environment Variables** section below.

## Environment Management

The project uses different database schemas and configurations for development and production:

- **Local Development:** Uses SQLite (`prisma/schema.development.prisma`). The database file (`prisma/dev.db`) is created automatically.
- **Production Simulation:** Uses Neon PostgreSQL (`prisma/schema.production.prisma`). Requires a `DATABASE_URL` in `.env.production`.

The `scripts/switchDbSchema.ts` script manages swapping `prisma/schema.prisma` with the correct environment-specific schema file before running Prisma commands. Most `npm run` scripts handle this automatically.

### Starting the Development Environment

These commands set up the SQLite database and start the Next.js development server.

```bash
# Easiest way: Delete existing DB, switch schema, generate Prisma client, push schema, seed data, start dev server
npm run dev:reset

# Or, if DB exists: Switch schema, generate, push, seed, start dev server
npm run dev:fresh

# Just start the dev server (assumes DB is already set up correctly)
npm run dev
```

### Production Environment

The application will be available at http://localhost:3000.

Simulating the Production Environment Locally
These commands allow you to test the production setup using your Neon PostgreSQL database. Ensure your Neon URL is correctly set in .env.production.

# Switch to production schema, generate Prisma client, push schema to Neon, seed Neon DB

npm run prod:reset

# Build the application using production settings

npm run build:prod

# Start the application using production settings (requires build first)

npm run start:prod

````

## Development Scripts

*   `npm run dev`: Starts the Next.js development server using the **current** `prisma/schema.prisma`.
*   `npm run build`: Builds the application for production using the **current** `prisma/schema.prisma`.
*   `npm run start`: Starts the production server (requires `npm run build` first).
*   `npm run db:dev`: Switches `prisma/schema.prisma` to use `schema.development.prisma`, then runs `prisma generate` and `prisma db push`.
*   `npm run db:prod`: Switches `prisma/schema.prisma` to use `schema.production.prisma`, then runs `prisma generate` and `prisma db push` using `.env.production`.
*   `npm run seed:dev`: Seeds the **development** (SQLite) database using `.env.local`. Includes initial model training if model files don't exist.
*   `npm run seed:prod`: Seeds the **production** (Neon) database using `.env.production`.
*   `npm run pre-build-train`: Trains the ML model using production database data. In Vercel (`IS_VERCEL=true`), uploads to Blob; locally, saves to filesystem. Requires `NODE_ENV=production`.
*   `npm run vercel-build`: Full production build sequence: switches to prod DB, creates model directory, seeds database, trains model, builds Next.js app.
*   `npm run dev:fresh`: Quick setup: switches to dev schema, generates client, pushes schema, seeds, starts dev server.
*   `npm run dev:reset`: Full reset: deletes existing dev database, then runs `dev:fresh`.
*   `npm run prod:test`: Full production simulation: resets prod DB, builds, and starts production server.
*   `npm test`: Runs Jest tests.
*   `npm run format`: Formats code with Prettier.
*   `npm run lint`: Lints code with ESLint.
*   `npm run type-check`: Runs TypeScript compiler checks.
*   `npm run validate`: Runs `type-check`, `lint`, and `build`.

## Environment Variables

### `.env.local` (Development)

Used by `npm run dev`, `npm run dev:reset`, `npm run seed:dev`, etc.

```dotenv
# Connection string for the local SQLite database
DATABASE_URL="file:./prisma/dev.db"  # Note: path matches dev:reset script
```

# Optional: Vercel Blob Read/Write Token for testing Blob uploads locally
# Get this from your Vercel Blob store settings (use the development token)
# Required if you manually run `pre-build-train` locally and want it to upload.
# BLOB_READ_WRITE_TOKEN="vercel_blob_dev_..."

### `.env.production` (Production Simulation / Vercel)

Used by `npm run prod:reset`, `npm run seed:prod`, `npm run build:prod`, `npm run start:prod`, and the `vercel-build` script. **These variables are typically set in the Vercel dashboard for actual deployments.**

```dotenv
# Connection string for your Neon PostgreSQL database
DATABASE_URL="postgres://user:password@host:port/dbname?sslmode=require"

# Vercel Blob Read/Write Token (REQUIRED for production builds/runtime)
# Set this in Vercel Environment Variables, not committed here.
# BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
```

_Note: `ML_MODEL_PATH` is no longer used._

## ML Model Handling

### Local Development

- The model is initially trained during the `seed:dev` script if it doesn't exist locally.
- It's saved to the `public/model/` directory (`model.json`, `weights.bin`, `normalization.json`) by the [`saveModel`](/Users/dylankinsella/geviti/src/services/ml/persistence.ts) function.
- The [`loadModel`](/Users/dylankinsella/geviti/src/services/ml/persistence.ts) function loads it from the `file://public/model/model.json` path on the server or `indexeddb://` in the browser.

### Production (Vercel)

- During the Vercel build process (`vercel-build` script -> `pre-build-train` script), the model is trained using data from the production database.
- The `saveModel` function detects the Vercel environment (`IS_VERCEL`) and uploads the model artifacts directly to Vercel Blob using the `BLOB_READ_WRITE_TOKEN`.
- The `loadModel` function detects Vercel and uses a custom `blobLoadHandler` to fetch the model artifacts directly from their Vercel Blob URLs at runtime.

## Troubleshooting

Common issues during local development:

1. **Database Connection Errors (`P1001`, etc.):**

   - Ensure you've run `npm run dev:reset` or `npm run dev:fresh` at least once
   - Verify the `DATABASE_URL` in `.env.local` points to `file:./prisma/dev.db`
   - Check if `prisma/schema.prisma` matches `schema.development.prisma`. If not, run `npm run db:dev`

2. **Model Loading Errors (404s for model files, IndexedDB errors):**

   - Ensure the `public/model/` directory contains `model.json`, `weights.bin`, and `normalization.json`
   - If files are missing, try running `npm run seed:dev` again (it includes training)
   - Clear browser cache/application data (IndexedDB) if you suspect corruption

3. **Type Errors:**

   - Run `npm run type-check` or `npm run validate` to identify TypeScript issues

4. **Production Simulation Issues:**

   - Verify the `DATABASE_URL` in `.env.production` is correct for your Neon database
   - Ensure you've run `npm run prod:reset` to switch the schema and seed the production DB
   - Check Vercel/Neon logs if running `build:prod` or `start:prod`

5. **Vercel Blob Errors (Local Testing/Build):**
   - Ensure `BLOB_READ_WRITE_TOKEN` is set correctly in `.env.local` (for local testing) or `.env.production` (for `vercel-build` simulation)
   - Check network connectivity and Vercel status
   - Verify the token has the correct permissions for the Blob store
````

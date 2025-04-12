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
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Backend:** Next.js API Routes
- **Database:** SQLite (Development) / Neon PostgreSQL (Production) with [Prisma ORM](https://www.prisma.io/)
- **ML:** [TensorFlow.js](https://www.tensorflow.org/js)
- **State Management:** [TanStack Query](https://tanstack.com/query)
- **Form Handling:** [React Hook Form](https://react-hook-form.com/) with [Zod](https://zod.dev/)
- **Testing:** [Jest](https://jestjs.io/) and [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- Git

### Local Development Setup

1.  Clone and install:

    ```bash
    git clone https://github.com/yourusername/geviti.git
    cd geviti
    npm install
    ```

2.  Start development server:
    ```bash
    npm run dev:reset  # Sets up database, seeds data, starts server
    ```

The application will be available at `http://localhost:3000`.

For detailed instructions, including production environment simulation and database management, see:

- [Development Guide](docs/DEVELOPMENT.md)
- [Architecture Decisions](docs/ARCHITECTURE.md)
- [API Documentation](docs/API.md)
- [ML Model Details](docs/ML_MODEL.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

## Development Commands

```bash
# Development
npm run dev          # Start dev server
npm run dev:reset    # Reset database and start dev server

# Testing
npm test            # Run tests
npm run type-check  # Check types

# Production Build
npm run build       # Build for production
npm start           # Start production server
```

## Deployment

This application is deployed on [Vercel](https://geviti-eight.vercel.app/) using Neon PostgreSQL and Vercel Blob storage. See the [Deployment Guide](docs/DEPLOYMENT.md) for details.

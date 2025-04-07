-- CreateTable
CREATE TABLE "TrainingData" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "squareFootage" INTEGER NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "price" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PredictionLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "squareFootage" INTEGER NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "predictedPrice" REAL NOT NULL,
    "confidence" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT
);

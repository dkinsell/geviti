import { PrismaClient } from "@prisma/client";
import mlService from "../src/services/ml/mlService";

const prisma = new PrismaClient();
const isProd = process.env.NODE_ENV === "production";

async function main() {
  console.log(
    `Starting database seed in ${isProd ? "production" : "development"} mode...`,
  );

  // Clear existing training data
  await prisma.trainingData.deleteMany({});
  console.log("Cleared existing training data");

  const trainingData = [
    { squareFootage: 800, bedrooms: 2, price: 150000 },
    { squareFootage: 1200, bedrooms: 3, price: 200000 },
    { squareFootage: 1500, bedrooms: 3, price: 250000 },
    { squareFootage: 1800, bedrooms: 4, price: 300000 },
    { squareFootage: 2000, bedrooms: 4, price: 320000 },
    { squareFootage: 2200, bedrooms: 5, price: 360000 },
    { squareFootage: 2400, bedrooms: 4, price: 380000 },
    { squareFootage: 2600, bedrooms: 5, price: 400000 },
  ];

  for (const data of trainingData) {
    const record = await prisma.trainingData.create({
      data,
    });
    console.log(`Created training record with ID: ${record.id}`);
  }

  console.log(
    `Database seeding completed successfully on ${isProd ? "Neon PostgreSQL" : "SQLite"}`,
  );

  // Only train model in production or if explicitly requested
  if (isProd || process.env.FORCE_TRAIN === "true") {
    console.log("Training ML model...");
    try {
      await mlService.trainNewModel();
      console.log("ML model training completed successfully");
    } catch (error) {
      console.error("Error training ML model:", error);
      throw error;
    }
  }

  console.log(
    `Seeding${isProd ? " and model training" : ""} completed successfully`,
  );
}

main()
  .catch((e) => {
    console.error(`Error during seeding: ${e}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient as PrismaProd } from "@prisma/client";
import { PrismaClient as PrismaDev } from ".prisma/client";

async function migrateData() {
  const devPrisma = new PrismaDev();
  const prodPrisma = new PrismaProd();

  try {
    // Migrate training data
    const trainingData = await devPrisma.trainingData.findMany();
    for (const record of trainingData) {
      await prodPrisma.trainingData.create({
        data: {
          squareFootage: record.squareFootage,
          bedrooms: record.bedrooms,
          price: record.price,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        },
      });
    }

    // Migrate prediction logs
    const predictionLogs = await devPrisma.predictionLog.findMany();
    for (const log of predictionLogs) {
      await prodPrisma.predictionLog.create({
        data: {
          squareFootage: log.squareFootage,
          bedrooms: log.bedrooms,
          predictedPrice: log.predictedPrice,
          confidence: log.confidence,
          createdAt: log.createdAt,
          ipAddress: log.ipAddress,
        },
      });
    }

    console.log("Data migration completed successfully");
  } catch (error) {
    console.error("Error during data migration:", error);
    throw error;
  } finally {
    await devPrisma.$disconnect();
    await prodPrisma.$disconnect();
  }
}

migrateData();

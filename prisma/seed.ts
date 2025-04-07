import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.trainingData.deleteMany({});

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

  console.log(`Start seeding training data...`);

  for (const data of trainingData) {
    const record = await prisma.trainingData.create({
      data,
    });
    console.log(`Created training record with ID: ${record.id}`);
  }

  console.log(`Seeding completed successfully.`);
}

main()
  .catch((e) => {
    console.error(`Error during seeding: ${e}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

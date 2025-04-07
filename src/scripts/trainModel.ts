import mlService from "@/services/ml/mlService";

async function trainModel() {
  try {
    console.log("Starting model training...");
    await mlService.trainNewModel();
    console.log("Model training completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Error during model training:", error);
    process.exit(1);
  }
}

trainModel();

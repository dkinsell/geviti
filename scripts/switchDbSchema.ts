import fs from "fs";
import path from "path";

const isProd = process.env.NODE_ENV === "production";
const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
const devSchemaPath = path.join(
  process.cwd(),
  "prisma/schema.development.prisma",
);
const prodSchemaPath = path.join(
  process.cwd(),
  "prisma/schema.production.prisma",
);

// Only backup if schema.prisma exists
if (fs.existsSync(schemaPath)) {
  fs.copyFileSync(schemaPath, `${schemaPath}.backup`);
  console.log("Backed up existing schema");
}

// Copy the appropriate schema
const sourceSchema = isProd ? prodSchemaPath : devSchemaPath;

if (!fs.existsSync(sourceSchema)) {
  throw new Error(
    `Source schema file not found: ${sourceSchema}. Please ensure ${
      isProd ? "schema.production.prisma" : "schema.development.prisma"
    } exists.`,
  );
}

fs.copyFileSync(sourceSchema, schemaPath);
console.log(`Switched to ${isProd ? "production" : "development"} schema`);

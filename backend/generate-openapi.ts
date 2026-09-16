import "./src/polyfills";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./src/app.module";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import * as fs from "fs";
import * as path from "path";

async function generate() {
  const app = await NestFactory.create(AppModule);
  const swaggerConfig = new DocumentBuilder()
    .setTitle("FSE Backend — Person A (Listing & Matching)")
    .setDescription("REST API for food surplus listings, matching engine queries, urgency scores, and IPFS uploads.")
    .setVersion("0.1.0")
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  
  const apiDir = path.join(__dirname, "../shared/api");
  if (!fs.existsSync(apiDir)) {
    fs.mkdirSync(apiDir, { recursive: true });
  }

  // Write JSON first
  const jsonPath = path.join(apiDir, "listing-openapi.json");
  fs.writeFileSync(jsonPath, JSON.stringify(document, null, 2));
  console.log(`OpenAPI JSON written to ${jsonPath}`);
  
  await app.close();
}

generate().catch(console.error);

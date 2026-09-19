import "./src/polyfills";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./src/app.module";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import * as fs from "fs";
import * as path from "path";

async function generate() {
  const app = await NestFactory.create(AppModule);

  const swaggerConfig = new DocumentBuilder()
    .setTitle("FSE Backend — Listings, Matching & NGO Orders")
    .setDescription(
      "REST API for food surplus listings, matching engine queries, urgency scores, IPFS uploads, NGO demand orders, custody handoffs, and Food Credit Tokens.",
    )
    .setVersion("0.1.0")
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  const apiDir = path.join(__dirname, "../shared/api");

  if (!fs.existsSync(apiDir)) {
    fs.mkdirSync(apiDir, { recursive: true });
  }

  const jsonPath = path.join(apiDir, "fse-openapi.json");

  fs.writeFileSync(jsonPath, JSON.stringify(document, null, 2));

  console.log(`OpenAPI JSON written to ${jsonPath}`);

  await app.close();
}

generate().catch((error) => {
  console.error(error);
  process.exit(1);
});

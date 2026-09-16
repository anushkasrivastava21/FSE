$3
3
3
3
3
3
3
3
3
3
3
3
3
3
3
3
3
3
  .toExponential.............................`  1
111111111111111import "./polyfills";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe for DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Enable CORS for frontend dev server
  app.enableCors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  });

  // Swagger / OpenAPI documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle("FSE Backend — Person A (Listing & Matching)")
    .setDescription(
      "REST API for food surplus listings, matching engine queries, urgency scores, and IPFS uploads.",
    )
    .setVersion("0.1.0")
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api", app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 FSE Backend running on http://localhost:${port}`);
console.log(`📄 Swagger docs at http://localhost:${port}/api`);
}

bootstrap();

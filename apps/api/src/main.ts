import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express from 'express';

async function bootstrap() {
  const logger = new Logger('RoadSaathi-Bootstrap');

  const app = await NestFactory.create(AppModule, {
    // Preserve raw body for Razorpay webhook HMAC verification
    rawBody: true,
  });

  // Enable CORS
  const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001,http://localhost:8081')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-razorpay-signature'],
  });

  // Global API Prefix
  app.setGlobalPrefix('api');

  // Swagger OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('RoadSaathi API')
    .setDescription(
      'Authoritative backend API for RoadSaathi - Roadside assistance & mechanics marketplace (India)'
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`🚀 RoadSaathi API running on port ${port} (API Docs: http://localhost:${port}/api/docs)`);
}

bootstrap();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WinstonModule } from 'nest-winston';
import { buildLoggerOptions } from './config/logger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(buildLoggerOptions()),
  });
  await app.listen(process.env.PORT ?? 8080);
}
void bootstrap();

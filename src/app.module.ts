import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';
import { LoggerModule } from './common/logger/logger.module';
import { AuthModule } from './auth/auth.module';
import { PublishersModule } from './publishers/publishers.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PasswordChangeRequiredGuard } from './common/guards/password-change-required.guard';
import { AuthorsModule } from './authors/authors.module';
import { BooksModule } from './books/books.module';
import { BranchesModule } from './branches/branches.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    LoggerModule,
    DatabaseModule,
    RedisModule,
    HealthModule,
    AuthModule,
    PublishersModule,
    AuthorsModule,
    BooksModule,
    BranchesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PasswordChangeRequiredGuard },
  ],
})
export class AppModule {}

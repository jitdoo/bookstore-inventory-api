import { Global, Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { buildLoggerOptions } from './winston.config';

@Global()
@Module({
  imports: [WinstonModule.forRoot(buildLoggerOptions())],
  exports: [WinstonModule],
})
export class LoggerModule {}

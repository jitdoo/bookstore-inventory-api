import { Logger } from '@nestjs/common';
import { Logger as TypeOrmLogger } from 'typeorm';

export class TypeOrmWinstonLogger implements TypeOrmLogger {
  private readonly logger = new Logger('TypeORM');

  logQuery(query: string, parameters?: unknown[]): void {
    this.logger.debug(this.format(query, parameters));
  }

  logQueryError(
    error: string | Error,
    query: string,
    parameters?: unknown[],
  ): void {
    this.logger.error(
      `Query failed: ${this.format(query, parameters)} -- ${String(error)}`,
    );
  }

  logQuerySlow(time: number, query: string, parameters?: unknown[]): void {
    this.logger.warn(
      `Slow query (${time}ms): ${this.format(query, parameters)}`,
    );
  }

  // CLI-run; outputs to console, not winston
  logSchemaBuild(message: string): void {
    this.logger.log(message);
  }

  // CLI-run; outputs to console, not winston
  logMigration(message: string): void {
    this.logger.log(message);
  }

  log(level: 'log' | 'info' | 'warn', message: unknown): void {
    if (level === 'warn') {
      this.logger.warn(String(message));
    } else {
      this.logger.log(String(message));
    }
  }

  private format(query: string, parameters?: unknown[]): string {
    if (!parameters?.length) {
      return query;
    }
    return `${query} -- ${JSON.stringify(parameters)}`;
  }
}

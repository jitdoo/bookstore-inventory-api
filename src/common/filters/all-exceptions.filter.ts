import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

// List of sensitive keys to mask in logs
const SENSITIVE_KEYS = [
  'password',
  'newPassword',
  'currentPassword',
  'token',
  'refreshToken',
];

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = isHttpException
      ? exception.getResponse()
      : 'Internal server error';

    // Log the error
    this.logger.error(`${request.method} ${request.url} ${status}`, {
      body: this.maskSensitive(request.body),
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    response.status(status).json({
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
      message,
    });
  }

  // Mask sensitive fields in the request body before logging
  private maskSensitive(body: unknown): unknown {
    if (body === null || typeof body !== 'object') {
      return body;
    }
    const masked: Record<string, unknown> = {
      ...(body as Record<string, unknown>),
    };
    for (const key of SENSITIVE_KEYS) {
      if (key in masked) {
        masked[key] = '***';
      }
    }
    return masked;
  }
}

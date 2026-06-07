import {
  WinstonModuleOptions,
  utilities as nestWinstonUtilities,
} from 'nest-winston';
import * as winston from 'winston';

export const buildLoggerOptions = (): WinstonModuleOptions => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    // Set log level based on environment
    level: isProduction ? 'info' : 'debug',
    transports: [
      new winston.transports.Console({
        // Use JSON format in production, and a more readable format in development
        format: isProduction
          ? winston.format.combine(
              winston.format.timestamp(),
              winston.format.json(),
            )
          : winston.format.combine(
              winston.format.timestamp(),
              winston.format.ms(),
              nestWinstonUtilities.format.nestLike('Bookstore', {
                colors: true,
                prettyPrint: true,
              }),
            ),
      }),
    ],
  };
};

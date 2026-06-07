import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { TypeOrmWinstonLogger } from '../common/logger/typeorm-winston.logger';

const isCompiled = __filename.endsWith('.js');

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [isCompiled ? 'dist/**/*.entity.js' : 'src/**/*.entity.ts'],
  migrations: [
    isCompiled
      ? 'dist/database/migrations/*.js'
      : 'src/database/migrations/*.ts',
  ],
  synchronize: false,
  logger: new TypeOrmWinstonLogger(),
  logging: process.env.NODE_ENV === 'development' ? 'all' : ['error', 'warn'],
};

export default new DataSource(dataSourceOptions);

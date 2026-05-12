import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { UserModel } from './models/user.model.js';
import { CustomFieldModel } from './models/custom-field.model.js';
import { DailyLogModel } from './models/daily-log.model.js';
import { FieldValueModel } from './models/field-value.model.js';
import { NotificationSubscriptionModel } from './models/notification-subscription.model.js';

import { AIInsightModel } from './models/ai-insight.model.js';

config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  schema: process.env.DB_SCHEMA,
  entities: [
    UserModel,
    CustomFieldModel,
    DailyLogModel,
    FieldValueModel,
    NotificationSubscriptionModel,
    AIInsightModel,
  ],
  migrations: ['dist/database/migrations/*.js'],
  synchronize: false,
  logging: true,
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;

import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  type: 'postgres' as const,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'vault_secure_password',
  database: process.env.DB_NAME || 'vaulted_mind_db',
  schema: process.env.DB_SCHEMA || 'public',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
}));

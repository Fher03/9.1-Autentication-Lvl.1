import pg from 'pg';
import env from 'dotenv'

env.config();

const db = new pg.Client({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT
});

export default db;


import pg from 'pg';

const db = new pg.Client({
  user: 'postgres',
  password: 'root',
  database: 'secrets',
  host: 'localhost',
  port: 5432
});

export default db;


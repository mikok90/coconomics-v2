const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function resetDatabase() {
  const client = new Client({
    host: 'localhost',
    port: 1234,
    user: 'postgres',
    password: '',
    database: 'postgres' // Connect to default postgres db first
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL');

    // Drop the database if it exists
    console.log('Dropping existing coconomics database...');
    await client.query('DROP DATABASE IF EXISTS coconomics');

    // Create a fresh database
    console.log('Creating fresh coconomics database...');
    await client.query('CREATE DATABASE coconomics');

    await client.end();

    // Connect to the new database
    const dbClient = new Client({
      host: 'localhost',
      port: 1234,
      user: 'postgres',
      password: '',
      database: 'coconomics'
    });

    await dbClient.connect();
    console.log('Connected to coconomics database');

    // Read and execute the migration
    const migrationPath = path.join(__dirname, 'migrations', '001_create_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration...');
    await dbClient.query(migrationSQL);

    // Create a default user and portfolio
    console.log('Creating default user and portfolio...');
    await dbClient.query(`
      INSERT INTO users (email, password_hash, name)
      VALUES ('demo@coconomics.com', 'demo', 'Demo User')
      ON CONFLICT DO NOTHING
    `);

    const userResult = await dbClient.query(`
      SELECT id FROM users WHERE email = 'demo@coconomics.com'
    `);

    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].id;
      await dbClient.query(`
        INSERT INTO portfolios (user_id, name, total_value)
        VALUES ($1, 'My Portfolio', 0)
        ON CONFLICT DO NOTHING
      `, [userId]);

      console.log('✅ Default user and portfolio created!');
    }

    await dbClient.end();

    console.log('✅ Database reset complete!');
    console.log('You can now start the backend with: npm run start:dev');

  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  }
}

resetDatabase();

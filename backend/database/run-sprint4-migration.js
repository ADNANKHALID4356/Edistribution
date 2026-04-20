const db = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🚀 Running Sprint 4 Database Migration...\n');
    
    await db.query('SELECT 1');
    console.log('✅ Database connected successfully');

    // Read migration SQL file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', '004_create_salesmen_table.sql'),c
      'utf8'
    );

    // Remove comments and split properly
    const lines = migrationSQL.split('\n');
    let currentStatement = '';
    const statements = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      // Skip pure comment lines and empty lines
      if (trimmedLine.startsWith('--') || trimmedLine === '') {
        continue;
      }
      
      currentStatement += ' ' + line;
      
      // If line ends with semicolon, we have a complete statement
      if (trimmedLine.endsWith(';')) {
        const cleanStatement = currentStatement.trim().replace(/;$/, '');
        if (cleanStatement.length > 0) {
          statements.push(cleanStatement);
        }
        currentStatement = '';
      }
    }

    // Execute each statement with error handling
    for (let i = 0; i < statements.length; i++) {
      try {
        await db.query(statements[i]);
        console.log(`✅ Statement ${i + 1}/${statements.length} executed`);
      } catch (error) {
        // Ignore duplicate key/field errors (already exists)
        if (error.code === 'ER_DUP_FIELDNAME' || error.code === 'ER_DUP_KEYNAME') {
          console.log(`⚠️  Statement ${i + 1} skipped (already exists)`);
        } else {
          throw error;
        }
      }
    }

    console.log('\n✅ Migration completed successfully!');

    // Now run seed data
    console.log('\n🌱 Seeding salesman data...');
    
    const seedSQL = fs.readFileSync(
      path.join(__dirname, 'seeds', '004_seed_salesmen.sql'),
      'utf8'
    );

    // Parse seed statements the same way
    const seedLines = seedSQL.split('\n');
    let currentSeedStatement = '';
    const seedStatements = [];
    
    for (const line of seedLines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('--') || trimmedLine === '') {
        continue;
      }
      
      currentSeedStatement += ' ' + line;
      
      if (trimmedLine.endsWith(';')) {
        const cleanStatement = currentSeedStatement.trim().replace(/;$/, '');
        if (cleanStatement.length > 0) {
          seedStatements.push(cleanStatement);
        }
        currentSeedStatement = '';
      }
    }

    for (const statement of seedStatements) {
      await db.query(statement);
    }

    console.log('✅ Seed data inserted successfully!');

    // Verify data
    const [salesmen] = await db.query('SELECT COUNT(*) as count FROM salesmen');
    const [routes] = await db.query('SELECT COUNT(*) as count FROM routes WHERE salesman_id IS NOT NULL');
    
    console.log(`\n📊 Verification:`);
    console.log(`   Salesmen created: ${salesmen[0].count}`);
    console.log(`   Routes assigned: ${routes[0].count}`);

    console.log('\n🎉 Sprint 4 database setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();

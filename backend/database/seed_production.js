const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function seedUsers() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'dist_user',
    password: 'Dist2025Secure',
    database: 'distribution_db'
  });

  console.log('🔧 Seeding users and salesmen...\n');

  // Generate password hashes
  const adminHash = bcrypt.hashSync('admin123', 10);
  const tahaHash = bcrypt.hashSync('taha123', 10);
  const hafizHash = bcrypt.hashSync('hafiz123', 10);

  // Insert users
  const users = [
    { id: 2, username: 'taha', password: tahaHash, email: 'taha@test.com', full_name: 'MUHAMMAD Taha', phone: '+92-300-0000000', role_id: 3 },
    { id: 3, username: 'hafiz', password: hafizHash, email: 'hafiz@test.com', full_name: 'Hafiz', phone: '+92-300-0000001', role_id: 3 },
    { id: 4, username: 'danis', password: adminHash, email: 'danis@test.com', full_name: 'Danis', phone: '+92-300-0000002', role_id: 3 }
  ];

  for (const user of users) {
    try {
      await connection.execute(
        'INSERT INTO users (id, username, password, email, full_name, phone, role_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
        [user.id, user.username, user.password, user.email, user.full_name, user.phone, user.role_id]
      );
      console.log(`✅ User created: ${user.username}`);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        console.log(`⚠️ User already exists: ${user.username}`);
      } else {
        console.error(`❌ Error creating ${user.username}:`, err.message);
      }
    }
  }

  // Create salesmen linked to users
  const salesmen = [
    { id: 1, user_id: 2, code: 'SM001', name: 'MUHAMMAD Taha', phone: '+92-300-0000000' },
    { id: 2, user_id: 3, code: 'SM002', name: 'Hafiz', phone: '+92-300-0000001' },
    { id: 3, user_id: 4, code: 'SM003', name: 'Danis', phone: '+92-300-0000002' }
  ];

  for (const sm of salesmen) {
    try {
      await connection.execute(
        'INSERT INTO salesmen (id, user_id, salesman_code, full_name, phone, is_active) VALUES (?, ?, ?, ?, ?, 1)',
        [sm.id, sm.user_id, sm.code, sm.name, sm.phone]
      );
      console.log(`✅ Salesman created: ${sm.name}`);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        console.log(`⚠️ Salesman already exists: ${sm.name}`);
      } else {
        console.error(`❌ Error creating salesman ${sm.name}:`, err.message);
      }
    }
  }

  // Update users with salesman_id (add column first if not exists)
  try {
    await connection.execute('ALTER TABLE users ADD COLUMN salesman_id INT NULL');
    console.log('✅ Added salesman_id column to users');
  } catch (err) {
    if (!err.message.includes('Duplicate column')) {
      console.log('⚠️ salesman_id column may already exist');
    }
  }

  // Link users to salesmen
  await connection.execute('UPDATE users SET salesman_id = 1 WHERE username = ?', ['taha']);
  await connection.execute('UPDATE users SET salesman_id = 2 WHERE username = ?', ['hafiz']);
  await connection.execute('UPDATE users SET salesman_id = 3 WHERE username = ?', ['danis']);
  console.log('✅ Users linked to salesmen');

  // Create a test route
  try {
    await connection.execute(
      'INSERT INTO routes (id, route_name, route_code, city, is_active) VALUES (1, "Route 1", "R001", "Lahore", 1)'
    );
    console.log('✅ Default route created');
  } catch (err) {
    console.log('⚠️ Route may already exist');
  }

  // Create a test shop
  try {
    await connection.execute(
      'INSERT INTO shops (id, shop_code, shop_name, owner_name, phone, city, route_id, is_active) VALUES (1, "SH001", "Test Shop", "Test Owner", "+92-300-1111111", "Lahore", 1, 1)'
    );
    console.log('✅ Test shop created');
  } catch (err) {
    console.log('⚠️ Shop may already exist');
  }

  // Create a test product
  try {
    await connection.execute(
      'INSERT INTO products (id, product_code, product_name, unit_price, stock_quantity, is_active) VALUES (1, "PRD001", "Test Product", 100.00, 1000, 1)'
    );
    console.log('✅ Test product created');
  } catch (err) {
    console.log('⚠️ Product may already exist');
  }

  await connection.end();
  console.log('\n✅ Seeding complete!');
}

seedUsers().catch(console.error);

const mysql = require('./backend/src/config/database');

async function r() {
  try {
    const [rows, fields] = await mysql.query("SHOW TABLES");
    console.log(rows.filter(r => JSON.stringify(r).includes('settings')));
    
    // Test company_settings query
    try {
        const [settings] = await mysql.query("SELECT * FROM company_settings LIMIT 1");
        console.log("Settings Data:", settings);
    } catch(err) {
        console.error("SELECT ERROR:", err.message);
    }
    process.exit(0);
  } catch(e) {
    console.error("DB CONN ERROR:", e.message);
    process.exit(1);
  }
}
r();
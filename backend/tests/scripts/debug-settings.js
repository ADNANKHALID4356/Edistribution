const db = require('./src/config/database');
const CompanySettings = require('./src/models/CompanySettings');

async function run() {
  try {
    console.log("Fetching settings...");
    const current = await CompanySettings.getSettings();
    console.log(current);

    console.log("Updating settings...");
    const payload = {
      company_name: "Test Update",
      company_city: "Lahore"
    };

    const updated = await CompanySettings.updateSettings(payload, 1);
    console.log("Updated result:", updated);

  } catch (err) {
    console.error("🔥 ERRORED:", err);
  } finally {
    process.exit(0);
  }
}

run();
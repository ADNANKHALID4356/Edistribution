# Database Setup Instructions

## Step 1: Create Database

Open MySQL Command Line or MySQL Workbench and run:

```sql
CREATE DATABASE IF NOT EXISTS distribution_system_db;
USE distribution_system_db;
```

Or run the SQL file:
```powershell
# Replace 'root' with your MySQL username if different
# You'll be prompted for your MySQL password
mysql -u root -p < database/create_db.sql
```

## Step 2: Create Tables (Run Schema)

```powershell
mysql -u root -p distribution_system_db < database/schema.sql
```

## Step 3: Insert Test Data (Optional)

```powershell
mysql -u root -p distribution_system_db < database/seeds.sql
```

## Step 4: Update .env File

Edit the `.env` file and set your MySQL password:

```
DB_PASSWORD=your_mysql_password_here
```

## Verification

After running the scripts, verify in MySQL:

```sql
USE distribution_system_db;
SHOW TABLES;
-- Should show: roles, users, sessions

SELECT * FROM roles;
-- Should show 3 roles: Admin, Manager, Salesman

SELECT * FROM users;
-- Should show 3 test users (if seeds were run)
```

## Test Users (from seeds.sql)

All test users have the same password: `admin123`

1. **Admin User**
   - Username: `admin`
   - Email: `admin@ummahtechinnovations.com`
   - Role: Admin

2. **Manager User**
   - Username: `manager1`
   - Email: `manager@ummahtechinnovations.com`
   - Role: Manager

3. **Salesman User**
   - Username: `salesman1`
   - Email: `salesman@ummahtechinnovations.com`
   - Role: Salesman

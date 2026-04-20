import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('147.93.108.205', username='root', password='Abbassi786..')

print("Generating DB migration script...")

sql = """USE distribution_db;

DELIMITER $$
DROP PROCEDURE IF EXISTS add_column_if_not_exists $$
CREATE PROCEDURE add_column_if_not_exists (
   IN dbName VARCHAR(64),
   IN tableName VARCHAR(64),
   IN columnName VARCHAR(64),
   IN columnDef VARCHAR(255)
)
BEGIN
   DECLARE _count INT;
   SELECT COUNT(*) INTO _count
   FROM information_schema.columns
   WHERE table_schema = dbName
   AND table_name = tableName
   AND column_name = columnName;

   IF _count = 0 THEN
      SET @q = CONCAT('ALTER TABLE ', tableName, ' ADD COLUMN ', columnName, ' ', columnDef);
      PREPARE stmt FROM @q;
      EXECUTE stmt;
      DEALLOCATE PREPARE stmt;
   END IF;
END $$
DELIMITER ;

CALL add_column_if_not_exists('distribution_db', 'order_details', 'unit_purchase_cost', 'DECIMAL(15,2) DEFAULT 0.00 AFTER product_id');
CALL add_column_if_not_exists('distribution_db', 'delivery_items', 'unit_purchase_cost', 'DECIMAL(15,2) DEFAULT 0.00 AFTER product_id');

SHOW COLUMNS FROM order_details LIKE 'unit_purchase_cost';
SHOW COLUMNS FROM delivery_items LIKE 'unit_purchase_cost';
"""

sftp = ssh.open_sftp()
with sftp.file('/tmp/migrate_pl.sql', 'w') as f:
    f.write(sql)
sftp.close()

print("Applying DB migration for P&L tracking...")
_, stdout, stderr = ssh.exec_command("mysql -u dist_user -pDist2025Secure distribution_db < /tmp/migrate_pl.sql")
print("Output:\n", stdout.read().decode())
err = stderr.read().decode()
if err and "Warning" not in err:
    print("ERRORS:\n", err)
ssh.close()

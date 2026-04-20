ALTER TABLE shops ADD salesman_id INT;
ALTER TABLE shops ADD FOREIGN KEY (salesman_id) REFERENCES salesmen(id) ON DELETE SET NULL;
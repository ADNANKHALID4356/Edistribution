-- Migration to add unit_purchase_cost parameter to order_details table
-- Helps track historical COGS precisely per item sold.

ALTER TABLE \`order_details\` ADD COLUMN \`unit_purchase_cost\` DECIMAL(15,2) NOT NULL DEFAULT 0.00 AFTER \`net_price\`;

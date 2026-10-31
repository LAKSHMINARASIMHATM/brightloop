CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`entity` varchar(80) NOT NULL,
	`entityId` int NOT NULL,
	`action` varchar(80) NOT NULL,
	`before` text,
	`after` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `billing_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`initiatedBy` int NOT NULL,
	`startedAt` timestamp NOT NULL,
	`finishedAt` timestamp,
	`createdCount` int NOT NULL DEFAULT 0,
	`skippedCount` int NOT NULL DEFAULT 0,
	`erroredCount` int NOT NULL DEFAULT 0,
	`errorDetails` text,
	CONSTRAINT `billing_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`name` varchar(200) NOT NULL,
	`email` varchar(320) NOT NULL,
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoice_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceId` int NOT NULL,
	`description` varchar(255) NOT NULL,
	`productId` int,
	`quantity` int NOT NULL DEFAULT 1,
	`unitPrice` decimal(12,2) NOT NULL,
	`taxAmount` decimal(12,2) NOT NULL DEFAULT '0',
	`discountAmount` decimal(12,2) NOT NULL DEFAULT '0',
	`amount` decimal(12,2) NOT NULL,
	CONSTRAINT `invoice_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`number` varchar(32) NOT NULL,
	`customerId` int NOT NULL,
	`subscriptionId` int NOT NULL,
	`billingPeriodStart` timestamp NOT NULL,
	`billingPeriodEnd` timestamp NOT NULL,
	`issueDate` timestamp NOT NULL,
	`dueDate` timestamp NOT NULL,
	`subtotal` decimal(12,2) NOT NULL,
	`taxAmount` decimal(12,2) NOT NULL DEFAULT '0',
	`discountAmount` decimal(12,2) NOT NULL DEFAULT '0',
	`total` decimal(12,2) NOT NULL,
	`status` enum('draft','confirmed','cancelled') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_number_unique` UNIQUE(`number`),
	CONSTRAINT `invoice_subscription_period_unique` UNIQUE(`subscriptionId`,`billingPeriodStart`,`billingPeriodEnd`)
);
--> statement-breakpoint
CREATE TABLE `payment_allocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`paymentId` int NOT NULL,
	`invoiceId` int NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payment_allocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`method` enum('cash','bank_transfer','card','cheque') NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`date` timestamp NOT NULL,
	`note` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plan_products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planId` int NOT NULL,
	`productId` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	CONSTRAINT `plan_products_id` PRIMARY KEY(`id`),
	CONSTRAINT `plan_product_unique` UNIQUE(`planId`,`productId`)
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`price` decimal(12,2) NOT NULL,
	`frequency` enum('daily','weekly','monthly','yearly') NOT NULL,
	`minimumQuantity` int NOT NULL DEFAULT 1,
	`availableFrom` timestamp NOT NULL,
	`availableTo` timestamp,
	`autoClose` boolean NOT NULL DEFAULT false,
	`allowEarlyClose` boolean NOT NULL DEFAULT false,
	`allowPause` boolean NOT NULL DEFAULT false,
	`allowRenew` boolean NOT NULL DEFAULT true,
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`attribute` varchar(80) NOT NULL,
	`value` varchar(120) NOT NULL,
	`priceAdjustment` decimal(12,2) NOT NULL,
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `product_variants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`type` varchar(80) NOT NULL,
	`salesPrice` decimal(12,2) NOT NULL,
	`costPrice` decimal(12,2) NOT NULL,
	`notes` text,
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscription_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subscriptionId` int NOT NULL,
	`productId` int NOT NULL,
	`variantId` int,
	`quantity` int NOT NULL DEFAULT 1,
	`unitPrice` decimal(12,2) NOT NULL,
	`taxAmount` decimal(12,2) NOT NULL DEFAULT '0',
	`amount` decimal(12,2) NOT NULL,
	CONSTRAINT `subscription_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`number` varchar(32) NOT NULL,
	`customerId` int NOT NULL,
	`planId` int NOT NULL,
	`startDate` timestamp NOT NULL,
	`expiryDate` timestamp,
	`paymentTerms` varchar(80) NOT NULL,
	`status` enum('draft','quotation','confirmed','active','closed','paused') NOT NULL DEFAULT 'draft',
	`nextBillingDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscriptions_number_unique` UNIQUE(`number`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','staff','finance','customer') NOT NULL DEFAULT 'user';--> statement-breakpoint
CREATE INDEX `audit_entity_idx` ON `audit_logs` (`entity`,`entityId`);--> statement-breakpoint
CREATE INDEX `audit_user_idx` ON `audit_logs` (`userId`);--> statement-breakpoint
CREATE INDEX `customer_user_idx` ON `customers` (`userId`);--> statement-breakpoint
CREATE INDEX `customer_status_idx` ON `customers` (`status`);--> statement-breakpoint
CREATE INDEX `invoice_customer_idx` ON `invoices` (`customerId`);--> statement-breakpoint
CREATE INDEX `invoice_due_date_idx` ON `invoices` (`dueDate`);--> statement-breakpoint
CREATE INDEX `invoice_status_idx` ON `invoices` (`status`);--> statement-breakpoint
CREATE INDEX `allocation_invoice_idx` ON `payment_allocations` (`invoiceId`);--> statement-breakpoint
CREATE INDEX `plan_status_idx` ON `plans` (`status`);--> statement-breakpoint
CREATE INDEX `plan_availability_idx` ON `plans` (`availableFrom`,`availableTo`);--> statement-breakpoint
CREATE INDEX `variant_product_idx` ON `product_variants` (`productId`);--> statement-breakpoint
CREATE INDEX `product_status_idx` ON `products` (`status`);--> statement-breakpoint
CREATE INDEX `subscription_status_idx` ON `subscriptions` (`status`);--> statement-breakpoint
CREATE INDEX `subscription_customer_idx` ON `subscriptions` (`customerId`);--> statement-breakpoint
CREATE INDEX `subscription_billing_idx` ON `subscriptions` (`nextBillingDate`);
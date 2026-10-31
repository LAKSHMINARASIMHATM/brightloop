import { boolean, decimal, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "staff", "finance", "customer"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ customerUserIdx: index("customer_user_idx").on(table.userId), customerStatusIdx: index("customer_status_idx").on(table.status) }));

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  type: varchar("type", { length: 80 }).notNull(),
  salesPrice: decimal("salesPrice", { precision: 12, scale: 2 }).notNull(),
  costPrice: decimal("costPrice", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ productStatusIdx: index("product_status_idx").on(table.status) }));

export const productVariants = mysqlTable("product_variants", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  attribute: varchar("attribute", { length: 80 }).notNull(),
  value: varchar("value", { length: 120 }).notNull(),
  priceAdjustment: decimal("priceAdjustment", { precision: 12, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ variantProductIdx: index("variant_product_idx").on(table.productId) }));

export const plans = mysqlTable("plans", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  frequency: mysqlEnum("frequency", ["daily", "weekly", "monthly", "yearly"]).notNull(),
  minimumQuantity: int("minimumQuantity").default(1).notNull(),
  availableFrom: timestamp("availableFrom").notNull(),
  availableTo: timestamp("availableTo"),
  autoClose: boolean("autoClose").default(false).notNull(),
  allowEarlyClose: boolean("allowEarlyClose").default(false).notNull(),
  allowPause: boolean("allowPause").default(false).notNull(),
  allowRenew: boolean("allowRenew").default(true).notNull(),
  status: mysqlEnum("status", ["draft", "active", "archived"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ planStatusIdx: index("plan_status_idx").on(table.status), planAvailabilityIdx: index("plan_availability_idx").on(table.availableFrom, table.availableTo) }));

export const planProducts = mysqlTable("plan_products", {
  id: int("id").autoincrement().primaryKey(),
  planId: int("planId").notNull(),
  productId: int("productId").notNull(),
  quantity: int("quantity").default(1).notNull(),
}, table => ({ planProductUnique: uniqueIndex("plan_product_unique").on(table.planId, table.productId) }));

export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  number: varchar("number", { length: 32 }).notNull().unique(),
  customerId: int("customerId").notNull(),
  planId: int("planId").notNull(),
  startDate: timestamp("startDate").notNull(),
  expiryDate: timestamp("expiryDate"),
  paymentTerms: varchar("paymentTerms", { length: 80 }).notNull(),
  status: mysqlEnum("status", ["draft", "quotation", "confirmed", "active", "closed", "paused"]).default("draft").notNull(),
  nextBillingDate: timestamp("nextBillingDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ subscriptionStatusIdx: index("subscription_status_idx").on(table.status), subscriptionCustomerIdx: index("subscription_customer_idx").on(table.customerId), subscriptionBillingIdx: index("subscription_billing_idx").on(table.nextBillingDate) }));

export const subscriptionLines = mysqlTable("subscription_lines", {
  id: int("id").autoincrement().primaryKey(),
  subscriptionId: int("subscriptionId").notNull(),
  productId: int("productId").notNull(),
  variantId: int("variantId"),
  quantity: int("quantity").default(1).notNull(),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal("taxAmount", { precision: 12, scale: 2 }).default("0").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
});

export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  number: varchar("number", { length: 32 }).notNull().unique(),
  customerId: int("customerId").notNull(),
  subscriptionId: int("subscriptionId").notNull(),
  billingPeriodStart: timestamp("billingPeriodStart").notNull(),
  billingPeriodEnd: timestamp("billingPeriodEnd").notNull(),
  issueDate: timestamp("issueDate").notNull(),
  dueDate: timestamp("dueDate").notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal("taxAmount", { precision: 12, scale: 2 }).default("0").notNull(),
  discountAmount: decimal("discountAmount", { precision: 12, scale: 2 }).default("0").notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["draft", "confirmed", "cancelled"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ invoiceSubscriptionPeriodUnique: uniqueIndex("invoice_subscription_period_unique").on(table.subscriptionId, table.billingPeriodStart, table.billingPeriodEnd), invoiceCustomerIdx: index("invoice_customer_idx").on(table.customerId), invoiceDueDateIdx: index("invoice_due_date_idx").on(table.dueDate), invoiceStatusIdx: index("invoice_status_idx").on(table.status) }));

export const invoiceLines = mysqlTable("invoice_lines", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: int("invoiceId").notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  productId: int("productId"),
  quantity: int("quantity").default(1).notNull(),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal("taxAmount", { precision: 12, scale: 2 }).default("0").notNull(),
  discountAmount: decimal("discountAmount", { precision: 12, scale: 2 }).default("0").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
});

export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  method: mysqlEnum("method", ["cash", "bank_transfer", "card", "cheque"]).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  note: text("note"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const paymentAllocations = mysqlTable("payment_allocations", {
  id: int("id").autoincrement().primaryKey(),
  paymentId: int("paymentId").notNull(),
  invoiceId: int("invoiceId").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ allocationInvoiceIdx: index("allocation_invoice_idx").on(table.invoiceId) }));

export const billingRuns = mysqlTable("billing_runs", {
  id: int("id").autoincrement().primaryKey(),
  periodStart: timestamp("periodStart").notNull(),
  periodEnd: timestamp("periodEnd").notNull(),
  initiatedBy: int("initiatedBy").notNull(),
  startedAt: timestamp("startedAt").notNull(),
  finishedAt: timestamp("finishedAt"),
  createdCount: int("createdCount").default(0).notNull(),
  skippedCount: int("skippedCount").default(0).notNull(),
  erroredCount: int("erroredCount").default(0).notNull(),
  errorDetails: text("errorDetails"),
});

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  entity: varchar("entity", { length: 80 }).notNull(),
  entityId: int("entityId").notNull(),
  action: varchar("action", { length: 80 }).notNull(),
  before: text("before"),
  after: text("after"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ auditEntityIdx: index("audit_entity_idx").on(table.entity, table.entityId), auditUserIdx: index("audit_user_idx").on(table.userId) }));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type Payment = typeof payments.$inferSelect;

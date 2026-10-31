import { and, desc, eq, inArray, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { ENV } from "./_core/env";
import {
  auditLogs,
  billingRuns,
  customers,
  invoices,
  invoiceLines,
  paymentAllocations,
  payments,
  plans,
  products,
  subscriptions,
  subscriptionLines,
  users,
  type InsertUser,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getVisibleCustomerIds(user: { id: number; role: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  if (user.role !== "customer") return null;
  const rows = await db.select({ id: customers.id }).from(customers).where(eq(customers.userId, user.id));
  return rows.map(row => row.id);
}

export async function listCustomers(user: { id: number; role: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const customerIds = await getVisibleCustomerIds(user);
  if (customerIds && customerIds.length === 0) return [];
  const query = db.select().from(customers);
  return customerIds ? query.where(inArray(customers.id, customerIds)) : query.orderBy(desc(customers.createdAt));
}

export async function listProducts() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(products).orderBy(desc(products.createdAt));
}

export async function listPlans() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(plans).orderBy(desc(plans.createdAt));
}

export async function listSubscriptions(user: { id: number; role: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const customerIds = await getVisibleCustomerIds(user);
  if (customerIds && customerIds.length === 0) return [];
  const query = db.select({ subscription: subscriptions, customer: customers, plan: plans })
    .from(subscriptions)
    .leftJoin(customers, eq(subscriptions.customerId, customers.id))
    .leftJoin(plans, eq(subscriptions.planId, plans.id))
    .orderBy(desc(subscriptions.createdAt));
  return customerIds ? query.where(inArray(subscriptions.customerId, customerIds)) : query;
}

export async function listInvoices(user: { id: number; role: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const customerIds = await getVisibleCustomerIds(user);
  if (customerIds && customerIds.length === 0) return [];
  const rows = await (customerIds
    ? db.select({ invoice: invoices, customer: customers }).from(invoices).leftJoin(customers, eq(invoices.customerId, customers.id)).where(inArray(invoices.customerId, customerIds)).orderBy(desc(invoices.createdAt))
    : db.select({ invoice: invoices, customer: customers }).from(invoices).leftJoin(customers, eq(invoices.customerId, customers.id)).orderBy(desc(invoices.createdAt)));
  return addBalances(rows);
}

async function addBalances(rows: Array<{ invoice: typeof invoices.$inferSelect; customer: typeof customers.$inferSelect | null }>) {
  const db = await getDb();
  if (!db || rows.length === 0) return rows.map(row => ({ ...row, paid: 0, balance: Number(row.invoice.total), derivedStatus: row.invoice.status }));
  const ids = rows.map(row => row.invoice.id);
  const allocations = await db.select().from(paymentAllocations).where(inArray(paymentAllocations.invoiceId, ids));
  return rows.map(row => {
    const paid = allocations.filter(item => item.invoiceId === row.invoice.id).reduce((sum, item) => sum + Number(item.amount), 0);
    const balance = Math.max(0, Number(row.invoice.total) - paid);
    const derivedStatus = row.invoice.status === "cancelled" ? "Cancelled" : balance === 0 ? "Paid" : row.invoice.dueDate < new Date() ? "Overdue" : paid > 0 ? "Partially paid" : "Unpaid";
    return { ...row, paid, balance, derivedStatus };
  });
}

export async function listPayments(user: { id: number; role: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select({ payment: payments, allocation: paymentAllocations }).from(payments).leftJoin(paymentAllocations, eq(payments.id, paymentAllocations.paymentId)).orderBy(desc(payments.createdAt));
  const customerIds = await getVisibleCustomerIds(user);
  if (!customerIds) return rows;
  const visibleInvoices = await db.select({ id: invoices.id }).from(invoices).where(inArray(invoices.customerId, customerIds));
  const visibleInvoiceIds = new Set(visibleInvoices.map(row => row.id));
  return rows.filter(row => row.allocation?.invoiceId && visibleInvoiceIds.has(row.allocation.invoiceId));
}

export async function createAudit(userId: number, entity: string, entityId: number, action: string, before?: unknown, after?: unknown) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(auditLogs).values({ userId, entity, entityId, action, before: before ? JSON.stringify(before) : null, after: after ? JSON.stringify(after) : null });
}

export async function createProduct(input: { name: string; type: string; salesPrice: string; costPrice: string; notes?: string | null }, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(products).values({ ...input, status: "active" });
  await createAudit(userId, "product", Number(result[0].insertId), "created", undefined, input);
  return Number(result[0].insertId);
}

export async function createPlan(input: { name: string; price: string; frequency: "daily" | "weekly" | "monthly" | "yearly"; minimumQuantity: number; availableFrom: Date; availableTo?: Date | null; autoClose: boolean; allowEarlyClose: boolean; allowPause: boolean; allowRenew: boolean }, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(plans).values({ ...input, status: "active" });
  await createAudit(userId, "plan", Number(result[0].insertId), "created", undefined, input);
  return Number(result[0].insertId);
}

export async function createSubscription(input: { customerId: number; planId: number; startDate: Date; expiryDate?: Date | null; paymentTerms: string; nextBillingDate: Date }, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const latest = await db.select({ id: subscriptions.id }).from(subscriptions).orderBy(desc(subscriptions.id)).limit(1);
  const number = `SUB-${String((latest[0]?.id ?? 0) + 1).padStart(4, "0")}`;
  const result = await db.insert(subscriptions).values({ ...input, number, status: "draft" });
  await createAudit(userId, "subscription", Number(result[0].insertId), "created", undefined, input);
  return { id: Number(result[0].insertId), number };
}

const allowedTransitions: Record<string, string[]> = { draft: ["quotation"], quotation: ["confirmed", "draft"], confirmed: ["active", "closed"], active: ["closed", "paused"], paused: ["active", "closed"], closed: [] };
export async function transitionSubscription(id: number, status: "draft" | "quotation" | "confirmed" | "active" | "closed" | "paused", userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const current = await db.select().from(subscriptions).where(eq(subscriptions.id, id)).limit(1);
  if (!current[0]) throw new Error("Subscription not found");
  if (!allowedTransitions[current[0].status].includes(status)) throw new Error(`Invalid subscription transition from ${current[0].status} to ${status}`);
  await db.update(subscriptions).set({ status }).where(eq(subscriptions.id, id));
  await createAudit(userId, "subscription", id, "status_changed", current[0], { ...current[0], status });
}

export async function runBilling(periodStart: Date, periodEnd: Date, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const startedAt = new Date();
  const run = await db.insert(billingRuns).values({ periodStart, periodEnd, initiatedBy: userId, startedAt });
  const billingRunId = Number(run[0].insertId);
  const due = await db.select().from(subscriptions).where(and(eq(subscriptions.status, "active"), lte(subscriptions.nextBillingDate, periodEnd)));
  let createdCount = 0; let skippedCount = 0; let erroredCount = 0; const errors: string[] = [];
  for (const subscription of due) {
    try {
      const existing = await db.select({ id: invoices.id }).from(invoices).where(and(eq(invoices.subscriptionId, subscription.id), eq(invoices.billingPeriodStart, periodStart), eq(invoices.billingPeriodEnd, periodEnd))).limit(1);
      if (existing[0]) { skippedCount += 1; continue; }
      const lines = await db.select().from(subscriptionLines).where(eq(subscriptionLines.subscriptionId, subscription.id));
      const subtotal = lines.reduce((sum, line) => sum + Number(line.amount), 0);
      const taxAmount = lines.reduce((sum, line) => sum + Number(line.taxAmount), 0);
      const total = subtotal + taxAmount;
      const dueDate = new Date(periodEnd.getTime() + 14 * 86400000);
      const created = await db.insert(invoices).values({ number: `INV-${Date.now()}-${subscription.id}`, customerId: subscription.customerId, subscriptionId: subscription.id, billingPeriodStart: periodStart, billingPeriodEnd: periodEnd, issueDate: new Date(), dueDate, subtotal: subtotal.toFixed(2), taxAmount: taxAmount.toFixed(2), discountAmount: "0", total: total.toFixed(2), status: "draft" });
      const invoiceId = Number(created[0].insertId);
      for (const line of lines) await db.insert(invoiceLines).values({ invoiceId, description: `Subscription ${subscription.number}`, productId: line.productId, quantity: line.quantity, unitPrice: line.unitPrice, taxAmount: line.taxAmount, discountAmount: "0", amount: line.amount });
      createdCount += 1;
    } catch (error) { erroredCount += 1; errors.push(`${subscription.number}: ${String(error)}`); }
  }
  await db.update(billingRuns).set({ finishedAt: new Date(), createdCount, skippedCount, erroredCount, errorDetails: errors.join("\n") || null }).where(eq(billingRuns.id, billingRunId));
  return { billingRunId, createdCount, skippedCount, erroredCount };
}

export async function confirmInvoice(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const before = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  if (!before[0] || before[0].status !== "draft") throw new Error("Only draft invoices can be confirmed");
  await db.update(invoices).set({ status: "confirmed" }).where(eq(invoices.id, id));
  await createAudit(userId, "invoice", id, "confirmed", before[0], { ...before[0], status: "confirmed" });
}

export async function recordPayment(input: { invoiceId: number; method: "cash" | "bank_transfer" | "card" | "cheque"; amount: string; date: Date; note?: string | null }, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const invoiceRows = await addBalances(await db.select({ invoice: invoices, customer: customers }).from(invoices).leftJoin(customers, eq(invoices.customerId, customers.id)).where(eq(invoices.id, input.invoiceId)));
  const invoice = invoiceRows[0];
  if (!invoice) throw new Error("Invoice not found");
  if (Number(input.amount) <= 0 || Number(input.amount) > invoice.balance) throw new Error("Payment exceeds the outstanding invoice balance");
  const payment = await db.insert(payments).values({ method: input.method, amount: input.amount, date: input.date, note: input.note ?? null, createdBy: userId });
  const paymentId = Number(payment[0].insertId);
  await db.insert(paymentAllocations).values({ paymentId, invoiceId: input.invoiceId, amount: input.amount });
  await createAudit(userId, "payment", paymentId, "created", undefined, input);
  if (Number(input.amount) === invoice.balance) await db.update(invoices).set({ status: "confirmed" }).where(eq(invoices.id, input.invoiceId));
  return paymentId;
}

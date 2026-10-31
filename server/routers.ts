import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";

const operatorProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user || !["admin", "staff", "finance", "user"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN", message: "Operator access required" });
  return next({ ctx });
});

const productInput = z.object({ name: z.string().min(1), type: z.string().min(1), salesPrice: z.string().regex(/^\d+(\.\d{1,2})?$/), costPrice: z.string().regex(/^\d+(\.\d{1,2})?$/), notes: z.string().optional() });
const planInput = z.object({ name: z.string().min(1), price: z.string().regex(/^\d+(\.\d{1,2})?$/), frequency: z.enum(["daily", "weekly", "monthly", "yearly"]), minimumQuantity: z.number().int().positive(), availableFrom: z.coerce.date(), availableTo: z.coerce.date().nullable().optional(), autoClose: z.boolean(), allowEarlyClose: z.boolean(), allowPause: z.boolean(), allowRenew: z.boolean() });

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  dashboard: router({
    overview: operatorProcedure.query(async ({ ctx }) => {
      const [subscriptionRows, invoiceRows, paymentRows] = await Promise.all([db.listSubscriptions(ctx.user), db.listInvoices(ctx.user), db.listPayments(ctx.user)]);
      const activeSubscriptions = subscriptionRows.filter(row => row.subscription.status === "active").length;
      const billedRevenue = invoiceRows.reduce((sum, row) => sum + Number(row.invoice.total), 0);
      const collectedPayments = paymentRows.reduce((sum, row) => sum + Number(row.payment.amount), 0);
      const outstanding = invoiceRows.reduce((sum, row) => sum + row.balance, 0);
      const overdue = invoiceRows.filter(row => row.derivedStatus === "Overdue").reduce((sum, row) => sum + row.balance, 0);
      return { kpis: { activeSubscriptions, billedRevenue, collectedPayments, outstanding, overdue }, subscriptions: subscriptionRows, invoices: invoiceRows, payments: paymentRows };
    }),
  }),
  customers: router({
    list: operatorProcedure.query(({ ctx }) => db.listCustomers(ctx.user)),
    create: operatorProcedure.input(z.object({ name: z.string().min(1), email: z.string().email() })).mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });
      const result = await database.insert((await import("../drizzle/schema")).customers).values(input);
      return { id: Number(result[0].insertId) };
    }),
  }),
  catalog: router({
    products: operatorProcedure.query(() => db.listProducts()),
    createProduct: adminProcedure.input(productInput).mutation(({ input, ctx }) => db.createProduct(input, ctx.user.id)),
    plans: operatorProcedure.query(() => db.listPlans()),
    createPlan: adminProcedure.input(planInput).mutation(({ input, ctx }) => db.createPlan(input, ctx.user.id)),
  }),
  subscriptions: router({
    list: operatorProcedure.query(({ ctx }) => db.listSubscriptions(ctx.user)),
    create: operatorProcedure.input(z.object({ customerId: z.number().int().positive(), planId: z.number().int().positive(), startDate: z.coerce.date(), expiryDate: z.coerce.date().nullable().optional(), paymentTerms: z.string().min(1), nextBillingDate: z.coerce.date() })).mutation(({ input, ctx }) => db.createSubscription(input, ctx.user.id)),
    transition: operatorProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["draft", "quotation", "confirmed", "active", "closed", "paused"]) })).mutation(({ input, ctx }) => db.transitionSubscription(input.id, input.status, ctx.user.id)),
  }),
  invoices: router({
    list: operatorProcedure.query(({ ctx }) => db.listInvoices(ctx.user)),
    runBilling: operatorProcedure.input(z.object({ periodStart: z.coerce.date(), periodEnd: z.coerce.date() })).mutation(({ input, ctx }) => db.runBilling(input.periodStart, input.periodEnd, ctx.user.id)),
    confirm: operatorProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input, ctx }) => db.confirmInvoice(input.id, ctx.user.id)),
  }),
  payments: router({
    list: operatorProcedure.query(({ ctx }) => db.listPayments(ctx.user)),
    record: operatorProcedure.input(z.object({ invoiceId: z.number().int().positive(), method: z.enum(["cash", "bank_transfer", "card", "cheque"]), amount: z.string().regex(/^\d+(\.\d{1,2})?$/), date: z.coerce.date(), note: z.string().optional() })).mutation(({ input, ctx }) => db.recordPayment(input, ctx.user.id)),
  }),
});

export type AppRouter = typeof appRouter;

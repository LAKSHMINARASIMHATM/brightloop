# Brightloop Billing — TODO

## Completed — Operations dashboard communicates the billing month
The overview now shows active subscriptions, monthly recurring revenue, collected cash, overdue balance, a billing-day attention strip, revenue pulse, collection health, invoices needing attention, and recent movement. Billed, collected, and outstanding amounts are visually distinguished. Evidence: `/` render verified at desktop and mobile widths.

## Completed — Role-aware subscription operations are represented in the UI
The shell provides navigation for overview, subscriptions, invoices, plans & products, payments, and reports. The current workspace and “Admin · Finance” role are visible, with customer and plan context on operational rows. Evidence: rendered sidebar and route-specific views.

## Completed — Subscription lifecycle is visible and actionable
Subscriptions show lifecycle status pills for Draft, Quotation, Confirmed, and Active, plus customer, plan, cadence, value, next invoice, and renewal context. Search, status filtering, detail opening, and invoice-linked row actions are implemented. Evidence: `/subscriptions` view and typed local fixtures in `client/src/pages/Home.tsx`.

## Completed — Recurring billing and invoice operations are usable
The invoice register shows invoice number, customer, subscription, issue date, due date, total, balance, and Paid / Partially paid / Unpaid / Overdue states. Billing-period and status filters, billing-run feedback, invoice detail drawer, draft invoice interaction, and payment entry are implemented. The demo billing run reports duplicate-safe results. Evidence: `/invoices` render verified; `pnpm check` and `pnpm build` pass.

## Completed — Plans and pricing are manageable
Plans & products includes monthly and annual plans, prices, cadence, subscribers, availability/lifecycle messaging, product catalog tabs, variants, and a create-plan interaction with price, frequency, availability, quantity, and auto-close inputs. Evidence: `/plans` render verified at desktop width.

## Completed — Payments and finance reporting support reconciliation
Payments view includes payment method, amount, date, note, invoice linkage, payment mix, and record-payment modal. Reports view distinguishes billed revenue, collected payments, outstanding balances, plan contribution, date/plan/customer filters, and export actions. Evidence: route implementation and UI source inspection.

## Completed — Responsive, accessible, and maintainable delivery
The app has responsive desktop/mobile layouts, visible focus states, semantic buttons and inputs, status labels with text plus color, and horizontal table handling. `/manus-routes.json` is synchronized with `/`, `/subscriptions`, `/invoices`, `/plans`, `/payments`, and `/reports`. `pnpm check` passes, `pnpm build` passes, `GET /api/health` returns `{"status":"ok"}`, and the route manifest returns HTTP 200 JSON.

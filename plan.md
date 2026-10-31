# Brightloop Billing — Implementation Plan

## Product direction
Build a polished internal subscription operations workspace for Brightloop Software. The primary surface is a dense-but-readable dashboard that helps a finance or operations lead answer: what is active, what is due, what is overdue, and what needs attention today. The prototype uses realistic local demo data and interactive client-side state for the main billing workflows; persistence and authentication remain prepared for the managed Server/Database configuration but are not required for the first visual milestone.

## Design exploration
- **Ledger Editorial (0.06):** a warm paper-like finance workspace with ink-blue type, amber highlights, ruled tables, and editorial hierarchy.
- **Quiet Control Room (0.07):** a calm, monochrome operations console with slate surfaces, electric mint status signals, and soft spatial rhythm.
- **Cobalt Service Desk (0.03):** a crisp enterprise SaaS console with deep navy framing, cobalt actions, and pale cyan system signals.

### Chosen style: Ledger Editorial

- **Design Movement:** Modern editorial finance software—Swiss grid discipline softened by paper, margin notes, and a warm ledger accent.
- **Core Principles:** (1) orient before acting, (2) status is always visible, (3) dense data gets breathing room, (4) every action has a clear next step.
- **Color Philosophy:** Ink navy gives the product authority; warm parchment prevents the dashboard from feeling sterile; mint and amber are reserved for status and attention, not decoration.
- **Layout Paradigm:** A left rail acts like a book spine. The content area uses offset editorial bands and a strong “today” strip rather than a generic centered card grid.
- **Signature Elements:** oversized page numerals, thin ledger rules, and pill-shaped status marks with tiny circular indicators.
- **Interaction Philosophy:** high-signal controls stay close to the data they affect; filters feel like a reading toolbar; row actions open focused detail panels rather than taking the user away.
- **Animation:** restrained 160–220ms fades and 8px lifts on hover; no looping motion except a subtle shimmer for loading states. Toast confirmations should slide from the lower right.
- **Typography System:** use Inter for UI and data, with Georgia italic for short editorial labels and narrative callouts. Headings are compact, slightly tracked, and never oversized beyond the dashboard’s working density.
- **Brand Essence:** the operating system for recurring revenue teams—measured, transparent, and quick to reconcile. Personality: exacting, calm, practical.
- **Brand Voice:** clear and operational, with a human edge. Example lines: “Your month, reconciled.” and “Nothing due today should be a surprise.”
- **Wordmark & Logo:** a compact looped “B” made from two linked ledger strokes, paired with the Brightloop name in a sturdy grotesk.
- **Signature Brand Color:** Brightloop amber (#F3B94F), used sparingly for due-soon states, active accents, and the logo mark.

## Implementation approach
- Replace the starter Home page with a responsive single-page operations console.
- Use Wouter for lightweight route state: `/` for overview, `/subscriptions`, `/invoices`, `/plans`, `/payments`, and `/reports`; route views share the same shell and local demo state.
- Keep business data in typed frontend fixtures so the prototype is immediately useful without a database seed or payment provider.
- Use reusable UI primitives already present in the starter plus Lucide icons and Recharts for the reporting view.
- Interactions to implement: nav switching, global search, status filters, billing-period filters, plan tab switching, create-plan modal, create-invoice modal, payment recording modal, invoice detail drawer, and toast feedback.
- Preserve the managed Server/Database starter and keep the app buildable through the existing `pnpm dev`, `pnpm check`, and `pnpm build` scripts.

## Project structure
- `client/src/App.tsx` — top-level route switch and providers.
- `client/src/pages/Home.tsx` — dashboard shell, navigation, view state, and primary workflows.
- `client/src/index.css` — Ledger Editorial visual system and responsive layout utilities.
- `client/public/manus-routes.json` — page route manifest for Preview and publication.
- `app.config.ts` — project logo metadata for checkpointing.
- `TODO.md` — outcome-oriented implementation checklist.

## Delivery workflow
1. Create the plan and TODO files.
2. Implement the shell, overview, and data views with responsive behavior.
3. Run diagnostics, type-check, and build.
4. Start the development service and verify the route manifest plus HTTP readiness.
5. Use managed screenshots for desktop and mobile visual review.
6. Fix confirmed issues, commit to `main`, and checkpoint the working version.

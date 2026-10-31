import {
  Activity,
  ArrowDownToLine,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Download,
  FileCheck2,
  FileText,
  Filter,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Package2,
  PieChart,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  Tag,
  UsersRound,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

type Status = "Active" | "Confirmed" | "Draft" | "Quotation" | "Closed" | "Paid" | "Partially paid" | "Unpaid" | "Overdue";

type Subscription = {
  id: string;
  customer: string;
  initials: string;
  companyColor: string;
  plan: string;
  cadence: string;
  amount: number;
  status: Status;
  nextInvoice: string;
  renewal: string;
  databaseId?: number;
  customerId?: number;
  planId?: number;
};

type Invoice = {
  id: string;
  customer: string;
  subscription: string;
  issueDate: string;
  dueDate: string;
  total: number;
  balance: number;
  status: Status;
  databaseId?: number;
};

type Payment = {
  id: string;
  customer: string;
  invoice: string;
  method: string;
  date: string;
  amount: number;
  note: string;
  databaseId?: number;
};

type Plan = {
  name: string;
  code: string;
  description: string;
  amount: number;
  cadence: string;
  subscribers: number;
  status: "Live" | "Draft";
  tone: "amber" | "blue" | "mint";
  features: string[];
};

const subscriptions: Subscription[] = [];
const invoices: Invoice[] = [];
const payments: Payment[] = [];
const plans: Plan[] = [];
const revenueData: Array<{ month: string; billed: number; collected: number; outstanding: number }> = [];

const navItems = [
  { label: "Overview", path: "/", icon: LayoutDashboard },
  { label: "Customers", path: "/customers", icon: UsersRound },
  { label: "Subscriptions", path: "/subscriptions", icon: RefreshCw },
  { label: "Invoices", path: "/invoices", icon: ReceiptText },
  { label: "Plans & products", path: "/plans", icon: Package2 },
  { label: "Payments", path: "/payments", icon: WalletCards },
  { label: "Reports", path: "/reports", icon: BarChart3 },
];

const formatMoney = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const formatCompactMoney = (value: number) => value >= 1000 ? `$${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k` : formatMoney(value);
const dateLabel = (value: Date | string | null | undefined) => value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(new Date(value)) : "—";
const displayStatus = (value: string): Status => ({ active: "Active", confirmed: "Confirmed", draft: "Draft", quotation: "Quotation", closed: "Closed", paused: "Confirmed", paid: "Paid", "partially paid": "Partially paid", unpaid: "Unpaid", overdue: "Overdue", Cancelled: "Closed" }[value] as Status) || "Draft";

function StatusPill({ status }: { status: Status }) {
  const tone = status === "Active" || status === "Paid" ? "success" : status === "Overdue" ? "danger" : status === "Partially paid" || status === "Confirmed" ? "info" : status === "Quotation" ? "warning" : "neutral";
  return <span className={`status-pill status-${tone}`}><span className="status-dot" />{status}</span>;
}

function Avatar({ initials, color }: { initials: string; color: string }) {
  return <span className={`avatar avatar-${color}`}>{initials}</span>;
}

function MetricCard({ label, value, helper, trend, icon: Icon, tone }: { label: string; value: string; helper: string; trend?: string; icon: typeof Activity; tone: string }) {
  return <div className="metric-card">
    <div className="metric-topline"><span>{label}</span><span className={`metric-icon metric-${tone}`}><Icon size={16} /></span></div>
    <div className="metric-value">{value}</div>
    <div className="metric-helper"><span>{helper}</span>{trend && <span className="metric-trend"><ArrowUpRight size={13} /> {trend}</span>}</div>
  </div>;
}

function RevenueChart({ compact = false, data = revenueData }: { compact?: boolean; data?: Array<{ month: string; billed: number; collected: number; outstanding: number }> }) {
  if (!data.length) return <div className="empty-state"><BarChart3 size={20} /><strong>No billing data yet</strong><span>Run billing after creating an active subscription.</span></div>;
  const max = Math.max(...data.map((item) => item.billed));
  return <div className={`chart-wrap ${compact ? "chart-compact" : ""}`}>
    <div className="chart-legend"><span><i className="legend-dot legend-billed" /> Billed</span><span><i className="legend-dot legend-collected" /> Collected</span><span><i className="legend-dot legend-outstanding" /> Outstanding</span></div>
    <div className="chart-area">
      <div className="chart-y-labels"><span>$50k</span><span>$25k</span><span>$0</span></div>
      <div className="chart-plot">
        <div className="chart-grid"><i /><i /><i /><i /></div>
        <div className="chart-bars">
          {data.map((item) => <div className="chart-column" key={item.month}>
            <div className="bar-group" title={`${item.month}: ${formatMoney(item.billed)} billed`}>
              <span className="bar bar-billed" style={{ height: `${(item.billed / max) * 88}%` }} />
              <span className="bar bar-collected" style={{ height: `${(item.collected / max) * 88}%` }} />
              <span className="bar bar-outstanding" style={{ height: `${(item.outstanding / max) * 88}%` }} />
            </div>
            <span className="chart-month">{item.month}</span>
          </div>)}
        </div>
      </div>
    </div>
  </div>;
}

function EmptySearch({ term }: { term: string }) {
  return <div className="empty-state"><Search size={20} /><strong>No matches for “{term}”</strong><span>Try a different customer, invoice, or status.</span></div>;
}

export default function Home() {
  const [location, setLocation] = useLocation();
  const dashboardQuery = trpc.dashboard.overview.useQuery();
  const plansQuery = trpc.catalog.plans.useQuery();
  const productsQuery = trpc.catalog.products.useQuery();
  const customersQuery = trpc.customers.list.useQuery();
  const meQuery = trpc.auth.me.useQuery();
  const billingMutation = trpc.invoices.runBilling.useMutation({ onSuccess: () => dashboardQuery.refetch() });
  const paymentMutation = trpc.payments.record.useMutation({ onSuccess: () => { dashboardQuery.refetch(); setShowPaymentModal(false); setPaymentAmount(""); } });
  const planMutation = trpc.catalog.createPlan.useMutation({ onSuccess: () => { plansQuery.refetch(); setShowPlanModal(false); } });
  const subscriptionMutation = trpc.subscriptions.create.useMutation({ onSuccess: () => { dashboardQuery.refetch(); setSubscriptionModalOpen(false); } });
  const customerMutation = trpc.customers.create.useMutation({ onSuccess: () => { customersQuery.refetch(); setCustomerModalOpen(false); } });
  const productMutation = trpc.catalog.createProduct.useMutation({ onSuccess: () => { productsQuery.refetch(); setProductModalOpen(false); } });
  const transitionMutation = trpc.subscriptions.transition.useMutation({ onSuccess: () => dashboardQuery.refetch() });
  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState("");
  const [invoiceFilter, setInvoiceFilter] = useState<"All" | Status>("All");
  const [subscriptionFilter, setSubscriptionFilter] = useState<"All" | Status>("All");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [billingRan, setBillingRan] = useState(false);
  const [planTab, setPlanTab] = useState<"Plans" | "Products">("Plans");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentInvoice, setPaymentInvoice] = useState("");

  useEffect(() => { setMobileNav(false); setSearch(""); }, [location]);

  const route = location === "/" || location === "/workspace" ? "overview" : location.slice(1);
  const pageTitle = route === "overview" ? "Your month, reconciled." : route === "plans" ? "Plans & products" : route.charAt(0).toUpperCase() + route.slice(1);
  const pageKicker = route === "overview" ? new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date()) : route === "reports" ? "Revenue intelligence" : route === "plans" ? "Catalog management" : `${route} workspace`;

  const liveSubscriptions: Subscription[] = (dashboardQuery.data?.subscriptions ?? []).map(({ subscription, customer, plan }) => ({
    id: subscription.number,
    databaseId: subscription.id,
    customerId: customer?.id,
    planId: plan?.id,
    customer: customer?.name ?? "Unassigned customer",
    initials: (customer?.name ?? "UC").split(" ").map(word => word[0]).join("").slice(0, 2),
    companyColor: "blue",
    plan: plan?.name ?? "Unassigned plan",
    cadence: plan?.frequency ? `${plan.frequency[0].toUpperCase()}${plan.frequency.slice(1)}` : "—",
    amount: plan ? Number(plan.price) : 0,
    status: displayStatus(subscription.status),
    nextInvoice: dateLabel(subscription.nextBillingDate),
    renewal: dateLabel(subscription.expiryDate),
  }));
  const liveInvoices: Invoice[] = (dashboardQuery.data?.invoices ?? []).map(({ invoice, customer, balance, derivedStatus }) => ({
    id: invoice.number,
    databaseId: invoice.id,
    customer: customer?.name ?? "Unassigned customer",
    subscription: String(invoice.subscriptionId),
    issueDate: dateLabel(invoice.issueDate),
    dueDate: dateLabel(invoice.dueDate),
    total: Number(invoice.total),
    balance,
    status: displayStatus(derivedStatus),
  }));
  const livePayments: Payment[] = (dashboardQuery.data?.payments ?? []).map(({ payment, allocation }) => ({
    id: `PMT-${payment.id}`,
    databaseId: payment.id,
    customer: allocation ? `Invoice ${allocation.invoiceId}` : "Unapplied",
    invoice: allocation ? `Invoice ${allocation.invoiceId}` : "Unapplied",
    method: payment.method.replace("_", " "),
    date: dateLabel(payment.date),
    amount: Number(payment.amount),
    note: payment.note ?? "—",
  }));
  const liveProducts = productsQuery.data ?? [];
  const livePlans: Plan[] = (plansQuery.data ?? []).map(plan => ({
    name: plan.name,
    code: `PLAN-${plan.id}`,
    description: "Persisted Brightloop subscription plan.",
    amount: Number(plan.price),
    cadence: `per ${plan.frequency}`,
    subscribers: liveSubscriptions.filter(subscription => subscription.planId === plan.id).length,
    status: plan.status === "active" ? "Live" : "Draft",
    tone: plan.frequency === "yearly" ? "amber" : plan.frequency === "monthly" ? "blue" : "mint",
    features: [`Minimum quantity ${plan.minimumQuantity}`, plan.allowRenew ? "Renewal enabled" : "Renewal disabled", plan.autoClose ? "Auto-close enabled" : "Manual close"],
  }));
  const visibleSubscriptions = useMemo(() => liveSubscriptions.filter((item) => {
    const matchesSearch = !search || `${item.id} ${item.customer} ${item.plan}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = subscriptionFilter === "All" || item.status === subscriptionFilter;
    return matchesSearch && matchesStatus;
  }), [liveSubscriptions, search, subscriptionFilter]);
  const visibleInvoices = useMemo(() => liveInvoices.filter((item) => {
    const matchesSearch = !search || `${item.id} ${item.customer} ${item.subscription}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = invoiceFilter === "All" || item.status === invoiceFilter;
    return matchesSearch && matchesStatus;
  }), [liveInvoices, search, invoiceFilter]);
  const navigate = (path: string) => setLocation(path);
  const kpis = dashboardQuery.data?.kpis ?? { activeSubscriptions: 0, billedRevenue: 0, collectedPayments: 0, outstanding: 0, overdue: 0 };
  const userName = meQuery.data?.name || "Signed-in user";
  const userInitials = userName.split(" ").map(word => word[0]).join("").slice(0, 2).toUpperCase() || "U";
  const userRole = meQuery.data?.role || "user";
  const runBilling = () => billingMutation.mutate({ periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1), periodEnd: new Date() });
  const recordPayment = () => {
    const invoice = liveInvoices.find(item => item.id === paymentInvoice);
    if (!invoice?.databaseId || !paymentAmount || Number(paymentAmount) <= 0) { toast.error("Choose an invoice and enter a valid amount"); return; }
    paymentMutation.mutate({ invoiceId: invoice.databaseId, method: "bank_transfer", amount: paymentAmount, date: new Date(), note: "Recorded in Brightloop" });
  };
  const createInvoice = () => { runBilling(); setShowInvoiceModal(false); toast("Billing run started", { description: "Due active subscriptions will be invoiced once, without duplicates." }); };
  const createPlan = (draft: { name: string; code: string; amount: number; cadence: string; description: string }) => planMutation.mutate({ name: draft.name, price: String(draft.amount || 0), frequency: (draft.cadence.toLowerCase().replace("per ", "") as "daily" | "weekly" | "monthly" | "yearly"), minimumQuantity: 1, availableFrom: new Date(), availableTo: null, autoClose: true, allowEarlyClose: true, allowPause: true, allowRenew: true });
  const createSubscription = (input: { customerId: number; planId: number; startDate: Date; paymentTerms: string }) => subscriptionMutation.mutate({ ...input, nextBillingDate: input.startDate, expiryDate: null });
  const createCustomer = (input: { name: string; email: string }) => customerMutation.mutate(input);
  const createProduct = (input: { name: string; type: string; salesPrice: string; costPrice: string; notes?: string }) => productMutation.mutate(input);
  const updateSubscriptionStatus = (id: string, status: Status) => { const subscription = liveSubscriptions.find(item => item.id === id); if (!subscription?.databaseId) return; const next = { Active: "active", Confirmed: "confirmed", Quotation: "quotation", Draft: "draft", Closed: "closed", "Partially paid": "active", Paid: "active", Unpaid: "active", Overdue: "active", "Paused": "paused" }[status] as "draft" | "quotation" | "confirmed" | "active" | "closed" | "paused"; transitionMutation.mutate({ id: subscription.databaseId, status: next }); };


  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
      <div className="brand-lockup"><span className="brand-mark"><span /></span><span className="brand-name">brightloop</span></div>
      <div className="workspace-switcher"><span className="workspace-avatar">B</span><span><strong>Brightloop Software</strong><small>Revenue workspace</small></span><ChevronDown size={15} /></div>
      <div className="rail-label">Workspace</div>
      <nav className="main-nav">{navItems.map(({ label, path, icon: Icon }) => <Link key={path} href={path} className={`nav-item ${location === path ? "nav-active" : ""}`} onClick={() => setMobileNav(false)}><Icon size={17} strokeWidth={location === path ? 2.5 : 1.8} /><span>{label}</span></Link>)}</nav>
      <div className="rail-spacer" />
      <div className="rail-note"><Sparkles size={17} /><div><strong>Clean books, calmer teams.</strong><span>All figures come from your persisted records.</span></div></div>
      <div className="rail-label">Manage</div>
      <button className="nav-item nav-button"><Settings2 size={17} /><span>Workspace settings</span></button>
      <button className="nav-item nav-button" onClick={() => toast("Help center opening soon", { description: "Your customer success team is on standby." })}><Bell size={17} /><span>Help & support</span></button>
      <div className="user-profile" onClick={() => setShowProfile((value) => !value)}><span className="profile-avatar">{userInitials}</span><span><strong>{userName}</strong><small>{userRole}</small></span><MoreHorizontal size={17} /></div>
    </aside>
    {mobileNav && <button className="mobile-overlay" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu size={20} /></button><div className="breadcrumb"><span>Brightloop</span><ChevronRight size={14} /><strong>{pageTitle}</strong></div><div className="topbar-actions"><div className="global-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search anything" /><kbd>⌘ K</kbd></div><button className="icon-button" aria-label="View notifications" onClick={() => toast("All caught up", { description: "No new account alerts." })}><Bell size={18} /><i /></button><div className="top-profile" onClick={() => setShowProfile((value) => !value)}><span className="profile-avatar profile-small">{userInitials}</span><ChevronDown size={14} /></div></div></header>
      <div className="page-content">
        <div className="page-heading"><div><p className="eyebrow">{pageKicker}</p><h1>{pageTitle}</h1>{route === "overview" && <p className="page-subtitle">A quick read on what moved, what’s due, and where cash is waiting.</p>}</div><div className="heading-actions">{route === "overview" && <Button variant="outline" className="soft-button" onClick={() => toast("Report exported", { description: "October revenue summary is ready to download." })}><Download size={15} /> Export report</Button>}{route === "invoices" && <Button className="primary-button" onClick={runBilling}><Zap size={15} /> {billingRan ? "Run complete" : "Run billing"}</Button>}{route === "plans" && <Button className="primary-button" onClick={() => setShowPlanModal(true)}><Plus size={16} /> New plan</Button>}{route === "payments" && <Button className="primary-button" onClick={() => setShowPaymentModal(true)}><Plus size={16} /> Record payment</Button>}</div></div>

        {route === "overview" && <Overview invoices={liveInvoices} kpis={kpis} onNavigate={navigate} onSelectInvoice={setSelectedInvoice} />}
        {route === "customers" && <CustomersView customers={customersQuery.data ?? []} onNewCustomer={() => setCustomerModalOpen(true)} />}
        {route === "subscriptions" && <SubscriptionsView subscriptions={visibleSubscriptions} filter={subscriptionFilter} setFilter={setSubscriptionFilter} onNewSubscription={() => setSubscriptionModalOpen(true)} onSelectSubscription={setSelectedSubscription} />}
        {route === "invoices" && <InvoicesView invoices={visibleInvoices} filter={invoiceFilter} setFilter={setInvoiceFilter} onSelectInvoice={setSelectedInvoice} onCreateInvoice={() => setShowInvoiceModal(true)} />}
        {route === "plans" && <PlansView plans={livePlans} products={liveProducts} planTab={planTab} setPlanTab={setPlanTab} onNewPlan={() => setShowPlanModal(true)} onNewProduct={() => setProductModalOpen(true)} />}
        {route === "payments" && <PaymentsView payments={livePayments} kpis={kpis} onNewPayment={() => setShowPaymentModal(true)} />}
        {route === "reports" && <ReportsView kpis={kpis} />}

      </div>
    </main>
    {selectedSubscription && <SubscriptionDrawer subscription={selectedSubscription} onClose={() => setSelectedSubscription(null)} onUpdateStatus={updateSubscriptionStatus} />}
    {selectedInvoice && <InvoiceDrawer invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} onPayment={() => { setPaymentInvoice(selectedInvoice.id); setSelectedInvoice(null); setShowPaymentModal(true); }} />}
    {subscriptionModalOpen && <SubscriptionModal customers={customersQuery.data ?? []} plans={plansQuery.data ?? []} onClose={() => setSubscriptionModalOpen(false)} onSave={createSubscription} />}
    {customerModalOpen && <CustomerModal onClose={() => setCustomerModalOpen(false)} onSave={(input) => customerMutation.mutate(input)} />}
    {productModalOpen && <ProductModal onClose={() => setProductModalOpen(false)} onSave={(input) => productMutation.mutate(input)} />}
    {showPlanModal && <PlanModal onClose={() => setShowPlanModal(false)} onSave={createPlan} />}
    {showPaymentModal && <PaymentModal invoiceData={liveInvoices} amount={paymentAmount} setAmount={setPaymentAmount} invoice={paymentInvoice} setInvoice={setPaymentInvoice} onClose={() => setShowPaymentModal(false)} onSave={recordPayment} />}
    {showInvoiceModal && <Modal title="Run billing" onClose={() => setShowInvoiceModal(false)}><div className="empty-state"><Zap size={20} /><strong>Generate due invoices from active subscriptions</strong><span>Billing is idempotent: rerunning the same period will never create duplicate invoices.</span></div><div className="modal-actions"><Button variant="outline" className="soft-button" onClick={() => setShowInvoiceModal(false)}>Cancel</Button><Button className="primary-button" onClick={createInvoice}>Run billing</Button></div></Modal>}
    {showProfile && <div className="profile-popover"><div className="popover-kicker">Signed in as</div><strong>{userName}</strong><span>{meQuery.data?.email || "Account profile"}</span><hr /><button onClick={() => toast("Profile settings opening soon")}>Profile settings</button><button onClick={() => toast("You are already in the right workspace")}>Switch workspace</button></div>}
  </div>;
}

function Overview({ invoices: invoiceData, kpis, onNavigate, onSelectInvoice }: { invoices: Invoice[]; kpis: { activeSubscriptions: number; billedRevenue: number; collectedPayments: number; outstanding: number; overdue: number }; onNavigate: (path: string) => void; onSelectInvoice: (invoice: Invoice) => void }) {
  const healthTotal = Math.max(1, invoiceData.length);
  const paidCount = invoiceData.filter(invoice => invoice.status === "Paid").length;
  const partialCount = invoiceData.filter(invoice => invoice.status === "Partially paid").length;
  const overdueCount = invoiceData.filter(invoice => invoice.status === "Overdue").length;
  const collectedRatio = kpis.billedRevenue ? Math.round((kpis.collectedPayments / kpis.billedRevenue) * 100) : 0;
  return <>
    <section className="metric-grid"><MetricCard label="Monthly recurring revenue" value={formatMoney(kpis.billedRevenue)} helper="Billed from persisted invoices" icon={CircleDollarSign} tone="amber" /><MetricCard label="Active subscriptions" value={String(kpis.activeSubscriptions)} helper="Active persisted subscriptions" icon={RefreshCw} tone="blue" /><MetricCard label="Collected this month" value={formatMoney(kpis.collectedPayments)} helper="Collected from persisted payments" icon={WalletCards} tone="mint" /><MetricCard label="Overdue balance" value={formatMoney(kpis.overdue)} helper="Derived from outstanding invoices" icon={Clock3} tone="coral" /></section>
    <section className="attention-strip"><div className="attention-icon"><Zap size={18} /></div><div className="attention-copy"><strong>Billing day is tomorrow.</strong><span>Run billing for due active subscriptions, then confirm and collect invoices.</span></div><button className="strip-action" onClick={() => onNavigate("/invoices")}>Review billing <ArrowUpRight size={14} /></button></section>
    <section className="overview-grid"><div className="panel revenue-panel"><div className="panel-heading"><div><p className="panel-kicker">Revenue pulse</p><h2>Persisted billing activity</h2></div><div className="segmented-control"><button className="segment-active">6 months</button><button>12 months</button></div></div><RevenueChart /></div><div className="panel health-panel"><div className="panel-heading"><div><p className="panel-kicker">Collection health</p><h2>Looking steady</h2></div><Activity size={18} className="panel-icon" /></div><div className="health-score"><div className="score-ring"><strong>{collectedRatio}<span>%</span></strong><small>collected</small></div><div className="health-copy"><strong>{formatMoney(kpis.outstanding)} still open</strong><span>Derived from persisted invoices</span><button onClick={() => onNavigate("/invoices")}>View outstanding <ChevronRight size={14} /></button></div></div><div className="health-bars"><div><span><i className="bar-mint" /> Paid <b>{paidCount}</b></span><em>{Math.round((paidCount / healthTotal) * 100)}%</em></div><div><span><i className="bar-amber" /> Partially paid <b>{partialCount}</b></span><em>{Math.round((partialCount / healthTotal) * 100)}%</em></div><div><span><i className="bar-coral" /> Overdue <b>{overdueCount}</b></span><em>{Math.round((overdueCount / healthTotal) * 100)}%</em></div></div></div></section>
    <section className="lower-grid"><div className="panel table-panel"><div className="panel-heading"><div><p className="panel-kicker">Next up</p><h2>Invoices needing attention</h2></div><button className="text-button" onClick={() => onNavigate("/invoices")}>View all <ChevronRight size={14} /></button></div><InvoiceTable invoices={invoiceData.filter(invoice => invoice.balance > 0).slice(0, 4)} onSelectInvoice={onSelectInvoice} compact /></div><div className="panel activity-panel"><div className="panel-heading"><div><p className="panel-kicker">Activity log</p><h2>Recent movement</h2></div><button className="icon-button subtle" aria-label="Refresh activity" onClick={() => toast("Activity reflects persisted records after refresh")}><RefreshCw size={15} /></button></div>{invoiceData.length ? <div className="activity-list">{invoiceData.slice(0, 4).map(invoice => <ActivityItem key={invoice.id} icon={FileText} color={invoice.status === "Paid" ? "mint" : "amber"} title={`Invoice ${invoice.status.toLowerCase()}`} detail={`${invoice.customer} · ${invoice.id}`} time={invoice.dueDate} amount={formatMoney(invoice.total)} />)}</div> : <div className="empty-state"><Activity size={20} /><strong>No activity yet</strong><span>Activity will appear after you create customers, subscriptions, invoices, or payments.</span></div>}</div></section>  </>;
}

function ActivityItem({ icon: Icon, color, title, detail, time, amount }: { icon: typeof Activity; color: string; title: string; detail: string; time: string; amount?: string }) {
  return <div className="activity-item"><span className={`activity-icon activity-${color}`}><Icon size={15} /></span><div><strong>{title}</strong><span>{detail}</span></div>{amount ? <b className="activity-amount">{amount}</b> : <time>{time}</time>}</div>;
}

function Toolbar({ children }: { children: React.ReactNode }) { return <div className="list-toolbar"><div className="toolbar-filters"><Filter size={15} />{children}</div><button className="soft-filter"><Download size={14} /> Export</button></div>; }

function CustomersView({ customers, onNewCustomer }: { customers: Array<{ id: number; name: string; email: string; status: string }>; onNewCustomer: () => void }) { return <div className="panel full-panel"><div className="panel-heading"><div><p className="panel-kicker">Persisted customer records</p><h2>Customers</h2></div><Button className="primary-button" onClick={onNewCustomer}><Plus size={15} /> New customer</Button></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Customer</th><th>Email</th><th>Status</th></tr></thead><tbody>{customers.map(customer => <tr key={customer.id}><td><strong>{customer.name}</strong></td><td>{customer.email}</td><td><StatusPill status={customer.status === "active" ? "Active" : "Closed"} /></td></tr>)}</tbody></table>{!customers.length && <div className="empty-state"><UsersRound size={20} /><strong>No customers yet</strong><span>Create the first persisted customer to start a subscription.</span></div>}</div></div>; }
function CustomerModal({ onClose, onSave }: { onClose: () => void; onSave: (input: { name: string; email: string }) => void }) { const [name, setName] = useState(""); const [email, setEmail] = useState(""); return <Modal title="New customer" onClose={onClose}><div className="form-grid"><label>Name<input value={name} onChange={event => setName(event.target.value)} placeholder="Company or customer name" autoFocus /></label><label>Email<input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="billing@example.com" /></label></div><div className="modal-actions"><Button variant="outline" className="soft-button" onClick={onClose}>Cancel</Button><Button className="primary-button" disabled={!name || !email} onClick={() => onSave({ name, email })}>Save customer</Button></div></Modal>; }
function ProductModal({ onClose, onSave }: { onClose: () => void; onSave: (input: { name: string; type: string; salesPrice: string; costPrice: string; notes?: string }) => void }) { const [name, setName] = useState(""); const [type, setType] = useState("Service"); const [salesPrice, setSalesPrice] = useState(""); const [costPrice, setCostPrice] = useState(""); const [notes, setNotes] = useState(""); return <Modal title="New product" onClose={onClose}><div className="form-grid"><label>Name<input value={name} onChange={event => setName(event.target.value)} placeholder="Product name" autoFocus /></label><label>Type<input value={type} onChange={event => setType(event.target.value)} placeholder="Service" /></label><label>Sales price<input type="number" value={salesPrice} onChange={event => setSalesPrice(event.target.value)} placeholder="0.00" /></label><label>Cost price<input type="number" value={costPrice} onChange={event => setCostPrice(event.target.value)} placeholder="0.00" /></label></div><label className="full-label">Notes<textarea value={notes} onChange={event => setNotes(event.target.value)} rows={3} placeholder="Internal product notes" /></label><div className="modal-actions"><Button variant="outline" className="soft-button" onClick={onClose}>Cancel</Button><Button className="primary-button" disabled={!name || !salesPrice || !costPrice} onClick={() => onSave({ name, type, salesPrice, costPrice, notes })}>Save product</Button></div></Modal>; }
function SubscriptionsView({ subscriptions: data, filter, setFilter, onNewSubscription, onSelectSubscription }: { subscriptions: Subscription[]; filter: "All" | Status; setFilter: (value: "All" | Status) => void; onNewSubscription: () => void; onSelectSubscription: (subscription: Subscription) => void }) {
  return <div className="panel full-panel"><div className="panel-heading"><div><p className="panel-kicker">Persisted subscriptions</p><h2>Subscription register</h2></div><Button className="primary-button" onClick={onNewSubscription}><Plus size={15} /> New subscription</Button></div><Toolbar><select value={filter} onChange={(event) => setFilter(event.target.value as "All" | Status)}><option value="All">All statuses</option><option>Active</option><option>Confirmed</option><option>Quotation</option><option>Draft</option></select><span className="toolbar-divider" /><span className="toolbar-label">Showing {data.length} persisted records</span></Toolbar><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Subscription</th><th>Customer</th><th>Plan</th><th>Status</th><th>Next invoice</th><th className="align-right">Value</th><th /></tr></thead><tbody>{data.map((item) => <tr key={item.id}><td><strong className="table-id">{item.id}</strong><span className="table-secondary">{item.cadence} billing</span></td><td><div className="customer-cell"><Avatar initials={item.initials} color={item.companyColor} /><strong>{item.customer}</strong></div></td><td>{item.plan}<span className="table-secondary">Renews {item.renewal}</span></td><td><StatusPill status={item.status} /></td><td>{item.nextInvoice}</td><td className="align-right"><strong>{formatCompactMoney(item.amount)}</strong></td><td><button className="row-action" onClick={() => onSelectSubscription(item)}><MoreHorizontal size={17} /></button></td></tr>)}</tbody></table>{data.length === 0 && <EmptySearch term="your filters" />}</div><div className="table-footer"><span>Showing 1–{data.length} persisted subscriptions</span><div className="pagination"><button disabled>‹</button><button className="page-active">1</button><button>2</button><button>3</button><button>›</button></div></div></div>;
}

function InvoicesView({ invoices: data, filter, setFilter, onSelectInvoice, onCreateInvoice }: { invoices: Invoice[]; filter: "All" | Status; setFilter: (value: "All" | Status) => void; onSelectInvoice: (invoice: Invoice) => void; onCreateInvoice: () => void }) {
  return <div className="panel full-panel"><div className="panel-heading"><div><p className="panel-kicker">Persisted billing records</p><h2>Invoice register</h2></div><div className="heading-inline"><span className="run-status"><i className={data.length ? "status-dot" : "status-dot dot-coral"} />{data.length ? "All systems ready" : "No matches"}</span><Button variant="outline" className="soft-button" onClick={onCreateInvoice}><Plus size={15} /> Create invoice</Button></div></div><Toolbar><select value={filter} onChange={(event) => setFilter(event.target.value as "All" | Status)}><option value="All">All statuses</option><option>Paid</option><option>Partially paid</option><option>Unpaid</option><option>Overdue</option></select><span className="toolbar-divider" /><select defaultValue="October 2026"><option>October 2026</option><option>September 2026</option><option>August 2026</option></select><span className="toolbar-label">{data.length} invoices</span></Toolbar><InvoiceTable invoices={data} onSelectInvoice={onSelectInvoice} /><div className="table-footer"><span>Showing 1–{data.length} persisted invoices</span><div className="pagination"><button disabled>‹</button><button className="page-active">1</button><button>2</button><button>3</button><button>…</button><button>›</button></div></div></div>;
}

function InvoiceTable({ invoices: data, onSelectInvoice, compact = false }: { invoices: Invoice[]; onSelectInvoice: (invoice: Invoice) => void; compact?: boolean }) {
  return <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Invoice</th><th>Customer</th><th>Due date</th><th>Status</th><th className="align-right">Total</th><th className="align-right">Balance</th><th /></tr></thead><tbody>{data.map((item) => <tr key={item.id} onClick={() => onSelectInvoice(item)} className="clickable-row"><td><strong className="table-id">{item.id}</strong><span className="table-secondary">{item.subscription} · Issued {item.issueDate}</span></td><td>{item.customer}</td><td className={item.status === "Overdue" ? "text-danger" : ""}>{item.dueDate}</td><td><StatusPill status={item.status} /></td><td className="align-right"><strong>{formatMoney(item.total)}</strong></td><td className="align-right"><strong className={item.balance ? "text-danger" : "text-muted"}>{formatMoney(item.balance)}</strong></td><td><ChevronRight size={16} className="row-chevron" /></td></tr>)}</tbody></table>{data.length === 0 && <EmptySearch term="your query" />}</div>;
}

function PlansView({ plans: planData, products: productData, planTab, setPlanTab, onNewPlan, onNewProduct }: { plans: Plan[]; products: Array<{ id: number; name: string; type: string; salesPrice: string; status: string }>; planTab: "Plans" | "Products"; setPlanTab: (tab: "Plans" | "Products") => void; onNewPlan: () => void; onNewProduct: () => void }) {
  return <><div className="subnav-tabs"><button className={planTab === "Plans" ? "tab-active" : ""} onClick={() => setPlanTab("Plans")}>Plans <span>{planData.length}</span></button><button className={planTab === "Products" ? "tab-active" : ""} onClick={() => setPlanTab("Products")}>Products & variants <span>{productData.length}</span></button></div>{planTab === "Plans" ? <div className="plan-grid">{planData.map((plan) => <PlanCard key={plan.code} plan={plan} onEdit={() => toast(`${plan.name} selected`, { description: "Plan details are ready to edit." })} />)}<button className="add-plan-card" onClick={onNewPlan}><span><Plus size={20} /></span><strong>Create a new plan</strong><small>Set price, cadence, terms, and availability.</small></button></div> : <div className="panel full-panel"><div className="panel-heading"><div><p className="panel-kicker">Persisted catalog</p><h2>Product catalog</h2></div><Button className="primary-button" onClick={onNewProduct}><Plus size={15} /> New product</Button></div>{productData.length ? <div className="product-list">{productData.map(product => <ProductRow key={product.id} name={product.name} type={product.type} variants={product.status} price={formatMoney(Number(product.salesPrice))} />)}</div> : <div className="empty-state"><Package2 size={20} /><strong>No products yet</strong><span>Create a product before linking it to a plan or subscription.</span></div>}</div>}</>;
}

function PlanCard({ plan, onEdit }: { plan: Plan; onEdit: () => void }) { return <div className={`plan-card plan-${plan.tone}`}><div className="plan-card-top"><span className="plan-status"><i /> {plan.status}</span><button className="row-action" onClick={onEdit}><MoreHorizontal size={17} /></button></div><div className="plan-code">{plan.code}</div><h3>{plan.name}</h3><p>{plan.description}</p><div className="plan-price"><strong>{formatMoney(plan.amount)}</strong><span>{plan.cadence}</span></div><div className="plan-divider" /><div className="plan-meta"><span><UsersRound size={14} /> {plan.subscribers} active subscribers</span><button onClick={onEdit}>Edit plan <ArrowUpRight size={13} /></button></div><ul>{plan.features.map((feature) => <li key={feature}><span>✓</span>{feature}</li>)}</ul></div>; }
function ProductRow({ name, type, variants, price }: { name: string; type: string; variants: string; price: string }) { return <div className="product-row"><span className="product-icon"><Package2 size={17} /></span><div><strong>{name}</strong><span>{type} · {variants}</span></div><b>{price}<small> base price</small></b><button className="row-action"><MoreHorizontal size={17} /></button></div>; }

function PaymentsView({ payments: paymentData, kpis, onNewPayment }: { payments: Payment[]; kpis: { collectedPayments: number }; onNewPayment: () => void }) { const average = paymentData.length ? paymentData.reduce((sum, payment) => sum + payment.amount, 0) / paymentData.length : 0; return <div className="payments-layout"><div className="panel full-panel"><div className="panel-heading"><div><p className="panel-kicker">Persisted payment records</p><h2>Payment activity</h2></div><Button className="primary-button" onClick={onNewPayment}><Plus size={15} /> Record payment</Button></div><div className="payment-summary"><div><span>Collected</span><strong>{formatMoney(kpis.collectedPayments)}</strong><small>From persisted allocations</small></div><div><span>Transactions</span><strong>{paymentData.length}</strong><small>Recorded payments</small></div><div><span>Average payment</span><strong>{formatMoney(average)}</strong><small>Across persisted records</small></div></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Payment</th><th>Customer</th><th>Method</th><th>Date</th><th>Note</th><th className="align-right">Amount</th></tr></thead><tbody>{paymentData.map((payment) => <tr key={payment.id}><td><strong className="table-id">{payment.id}</strong><span className="table-secondary">Applied to {payment.invoice}</span></td><td>{payment.customer}</td><td><span className="method-badge"><CreditCard size={13} />{payment.method}</span></td><td>{payment.date}</td><td>{payment.note}</td><td className="align-right"><strong className="text-success">+{formatMoney(payment.amount)}</strong></td></tr>)}</tbody></table>{!paymentData.length && <EmptySearch term="persisted payments" />}</div></div><div className="panel method-panel"><div className="panel-heading"><div><p className="panel-kicker">By method</p><h2>Collection mix</h2></div></div>{paymentData.length ? <div className="method-list">{Array.from(new Set(paymentData.map(payment => payment.method))).map(method => <span key={method}><i className="dot-blue" /> {method} <b>{paymentData.filter(payment => payment.method === method).length}</b></span>)}</div> : <div className="empty-state"><CreditCard size={20} /><strong>No payment methods yet</strong><span>Record a payment to build the collection mix.</span></div>}</div></div>; }
function ReportsView({ kpis }: { kpis: { billedRevenue: number; collectedPayments: number; outstanding: number; overdue: number } }) { return <><section className="metric-grid report-metrics"><MetricCard label="Billed revenue" value={formatMoney(kpis.billedRevenue)} helper="From persisted invoices" icon={FileText} tone="blue" /><MetricCard label="Collected payments" value={formatMoney(kpis.collectedPayments)} helper="From persisted allocations" icon={WalletCards} tone="mint" /><MetricCard label="Outstanding" value={formatMoney(kpis.outstanding)} helper="Derived invoice balance" icon={Clock3} tone="coral" /><MetricCard label="Overdue" value={formatMoney(kpis.overdue)} helper="Derived from due dates" icon={Activity} tone="amber" /></section><div className="report-layout"><div className="panel revenue-panel"><div className="panel-heading"><div><p className="panel-kicker">Revenue report</p><h2>Billed vs. collected</h2></div><div className="report-actions"><button className="soft-filter"><CalendarDays size={14} /> Current data <ChevronDown size={14} /></button><button className="soft-filter" onClick={() => toast("Export is available once report rows exist")}><Download size={14} /> Export CSV</button></div></div><div className="empty-state"><BarChart3 size={20} /><strong>No time-series data yet</strong><span>Create invoices and payments to populate reporting charts.</span></div></div><div className="panel report-breakdown"><div className="panel-heading"><div><p className="panel-kicker">Revenue by plan</p><h2>Persisted plan performance</h2></div></div><div className="empty-state"><PieChart size={20} /><strong>No plan revenue yet</strong><span>Active subscriptions and invoices will appear here after creation.</span></div></div></div><div className="panel full-panel"><div className="panel-heading"><div><p className="panel-kicker">Report filters</p><h2>Build a focused view</h2></div><button className="text-button" onClick={() => toast("Filters reset")}>Reset filters</button></div><div className="report-filters"><label>Date range<select defaultValue="All time"><option>All time</option><option>This month</option><option>Last 3 months</option></select></label><label>Status<select defaultValue="All statuses"><option>All statuses</option><option>Paid</option><option>Overdue</option></select></label><Button className="primary-button" onClick={() => toast.success("Report updated", { description: "Filters are applied to the persisted report dataset." })}>Apply filters</Button></div></div></>; }
function Breakdown({ name, value, percent, width, color }: { name: string; value: string; percent: string; width: string; color: string }) { return <div className="breakdown-row"><div><span>{name}</span><b>{value}</b></div><div className="breakdown-bar"><i className={`fill-${color}`} style={{ width }} /></div><small>{percent}</small></div>; }

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-header"><div><p className="panel-kicker">Brightloop workspace</p><h2 id="modal-title">{title}</h2></div><button className="icon-button subtle" aria-label="Close dialog" onClick={onClose}><X size={18} /></button></div>{children}</div></div>; }
function PlanModal({ onClose, onSave }: { onClose: () => void; onSave: (draft: { name: string; code: string; amount: number; cadence: string; description: string }) => void }) {
  const [draft, setDraft] = useState({ name: "", code: "", amount: 0, cadence: "Monthly", description: "" });
  return <Modal title="Create a new plan" onClose={onClose}><div className="form-grid"><label>Plan name<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. Pro Monthly" autoFocus /></label><label>Plan code<input value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value })} placeholder="e.g. PRO-M" /></label><label>Price<input type="number" value={draft.amount || ""} onChange={(event) => setDraft({ ...draft, amount: Number(event.target.value) })} placeholder="0.00" /></label><label>Billing frequency<select value={draft.cadence} onChange={(event) => setDraft({ ...draft, cadence: event.target.value })}><option>Daily</option><option>Weekly</option><option>Monthly</option><option>Yearly</option></select></label><label>Available from<input type="date" defaultValue="2026-11-01" /></label><label>Minimum quantity<input type="number" defaultValue="1" min="1" /></label></div><label className="full-label">Description<textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="What this plan is best for..." rows={3} /></label><div className="check-row"><input type="checkbox" defaultChecked id="auto-close" /><label htmlFor="auto-close">Close automatically when the plan expires</label></div><div className="modal-actions"><Button variant="outline" className="soft-button" onClick={onClose}>Cancel</Button><Button className="primary-button" onClick={() => onSave({ ...draft, name: draft.name || "Untitled plan", code: draft.code || "NEW-PLAN", description: draft.description || "New Brightloop subscription plan." })}>Save plan</Button></div></Modal>; }
function PaymentModal({ invoiceData, amount, setAmount, invoice, setInvoice, onClose, onSave }: { invoiceData: Invoice[]; amount: string; setAmount: (value: string) => void; invoice: string; setInvoice: (value: string) => void; onClose: () => void; onSave: () => void }) { const selected = invoiceData.find((item) => item.id === invoice); return <Modal title="Record payment" onClose={onClose}><div className="form-grid"><label>Invoice<select value={invoice} onChange={(event) => setInvoice(event.target.value)}><option value="">Select an invoice</option>{invoiceData.filter(item => item.balance > 0).map(item => <option key={item.id} value={item.id}>{item.id} · {item.customer}</option>)}</select></label><label>Amount<input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="$0.00" autoFocus /></label><label>Payment method<select defaultValue="bank_transfer"><option value="bank_transfer">Bank transfer</option><option value="card">Card</option><option value="cash">Cash</option><option value="cheque">Cheque</option></select></label><label>Date<input type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label></div><label className="full-label">Note<input placeholder="Optional note for your finance trail" /></label><div className="modal-summary"><span>Outstanding after payment</span><strong>{formatMoney(Math.max(0, (selected?.balance || 0) - (Number(amount) || 0)))}</strong></div><div className="modal-actions"><Button variant="outline" className="soft-button" onClick={onClose}>Cancel</Button><Button className="primary-button" disabled={!selected || !amount} onClick={onSave}>Save payment</Button></div></Modal>; }
function SubscriptionModal({ customers, plans, onClose, onSave }: { customers: Array<{ id: number; name: string }>; plans: Array<{ id: number; name: string }>; onClose: () => void; onSave: (input: { customerId: number; planId: number; startDate: Date; paymentTerms: string }) => void }) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? 0);
  const [planId, setPlanId] = useState(plans[0]?.id ?? 0);
  const [startDate, setStartDate] = useState("2026-11-01");
  const [paymentTerms, setPaymentTerms] = useState("Net 14");
  const ready = customerId > 0 && planId > 0;
  return <Modal title="New subscription" onClose={onClose}><div className="form-grid"><label>Customer<select value={customerId} onChange={(event) => setCustomerId(Number(event.target.value))}>{customers.length ? customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>) : <option value={0}>Create a customer first</option>}</select></label><label>Plan<select value={planId} onChange={(event) => setPlanId(Number(event.target.value))}>{plans.length ? plans.map(plan => <option key={plan.id} value={plan.id}>{plan.name}</option>) : <option value={0}>Create a plan first</option>}</select></label><label>Start date<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label>Payment terms<select value={paymentTerms} onChange={(event) => setPaymentTerms(event.target.value)}><option>Due on receipt</option><option>Net 14</option><option>Net 30</option></select></label></div>{!ready && <div className="empty-state"><strong>Customer and plan required</strong><span>Create persisted records before opening a subscription.</span></div>}<div className="modal-summary"><span>Initial lifecycle</span><strong>Draft → Quotation</strong></div><div className="modal-actions"><Button variant="outline" className="soft-button" onClick={onClose}>Cancel</Button><Button className="primary-button" disabled={!ready} onClick={() => onSave({ customerId, planId, startDate: new Date(startDate), paymentTerms })}>Create draft</Button></div></Modal>;
}
function SubscriptionDrawer({ subscription, onClose, onUpdateStatus }: { subscription: Subscription; onClose: () => void; onUpdateStatus: (id: string, status: Status) => void }) { return <div className="drawer-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><aside className="invoice-drawer" role="dialog" aria-modal="true" aria-label={`Subscription ${subscription.id}`}><div className="drawer-header"><div><p className="panel-kicker">Subscription detail</p><h2>{subscription.id}</h2></div><button className="icon-button subtle" aria-label="Close subscription detail" onClick={onClose}><X size={18} /></button></div><div className="drawer-customer"><Avatar initials={subscription.initials} color={subscription.companyColor} /><div><strong>{subscription.customer}</strong><span>{subscription.plan} · {subscription.cadence}</span></div><StatusPill status={subscription.status} /></div><div className="invoice-total"><span>Contract value</span><strong>{formatCompactMoney(subscription.amount)}</strong><small>Next invoice {subscription.nextInvoice}</small></div><div className="invoice-details"><div><span>Plan</span><strong>{subscription.plan}</strong></div><div><span>Billing</span><strong>{subscription.cadence}</strong></div><div><span>Next invoice</span><strong>{subscription.nextInvoice}</strong></div><div><span>Renewal</span><strong>{subscription.renewal}</strong></div></div><div className="drawer-section"><div className="drawer-section-title"><span>Lifecycle</span></div><div className="timeline"><div className="timeline-item"><i className={subscription.status === "Draft" ? "timeline-next" : "timeline-complete"} /><div><strong>Draft / quotation</strong><span>Prepared for customer review</span></div></div><div className="timeline-item"><i className={subscription.status === "Active" ? "timeline-complete" : "timeline-next"} /><div><strong>Confirmed / active</strong><span>Start service when approved</span></div></div><div className="timeline-item"><i className={subscription.status === "Closed" ? "timeline-alert" : "timeline-next"} /><div><strong>Closed</strong><span>End the billing relationship</span></div></div></div></div><div className="drawer-actions"><Button variant="outline" className="soft-button" onClick={() => onUpdateStatus(subscription.id, subscription.status === "Draft" ? "Quotation" : subscription.status === "Quotation" ? "Confirmed" : "Active")}>{subscription.status === "Active" ? "Keep active" : "Advance lifecycle"}</Button><Button className="primary-button" onClick={() => onUpdateStatus(subscription.id, "Closed")}><X size={15} /> Close subscription</Button></div></aside></div>; }
function InvoiceDrawer({ invoice, onClose, onPayment }: { invoice: Invoice; onClose: () => void; onPayment: () => void }) { return <div className="drawer-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><aside className="invoice-drawer"><div className="drawer-header"><div><p className="panel-kicker">Invoice detail</p><h2>{invoice.id}</h2></div><button className="icon-button subtle" onClick={onClose}><X size={18} /></button></div><div className="drawer-customer"><Avatar initials={invoice.customer.split(" ").map((word) => word[0]).join("").slice(0, 2)} color="blue" /><div><strong>{invoice.customer}</strong><span>Subscription {invoice.subscription}</span></div><StatusPill status={invoice.status} /></div><div className="invoice-total"><span>Outstanding balance</span><strong>{formatMoney(invoice.balance)}</strong><small>Total invoice {formatMoney(invoice.total)}</small></div><div className="invoice-details"><div><span>Issue date</span><strong>{invoice.issueDate}</strong></div><div><span>Due date</span><strong className={invoice.status === "Overdue" ? "text-danger" : ""}>{invoice.dueDate}</strong></div><div><span>Payment terms</span><strong>Net 14</strong></div><div><span>Tax</span><strong>$0.00</strong></div></div><div className="drawer-section"><div className="drawer-section-title"><span>Line items</span><button className="text-button">Edit</button></div><div className="line-item"><div><strong>Brightloop Core</strong><span>1 × monthly subscription</span></div><b>{formatMoney(invoice.total)}</b></div></div><div className="drawer-section"><div className="drawer-section-title"><span>Timeline</span></div><div className="timeline"><div className="timeline-item"><i className="timeline-complete" /><div><strong>Invoice issued</strong><span>{invoice.issueDate}</span></div></div><div className="timeline-item"><i className={invoice.status === "Overdue" ? "timeline-alert" : "timeline-next"} /><div><strong>{invoice.status === "Paid" ? "Payment received" : invoice.status === "Overdue" ? "Payment overdue" : "Payment due"}</strong><span>{invoice.dueDate}</span></div></div></div></div><div className="drawer-actions"><Button variant="outline" className="soft-button" onClick={() => toast("Invoice PDF generated", { description: `${invoice.id}.pdf is ready to download.` })}><Download size={15} /> Download PDF</Button>{invoice.balance > 0 && <Button className="primary-button" onClick={onPayment}><CreditCard size={15} /> Record payment</Button>}</div></aside></div>; }

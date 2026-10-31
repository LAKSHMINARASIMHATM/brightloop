import { ArrowRight, BarChart3, Check, CircleDollarSign, FileText, LockKeyhole, Menu, RefreshCw, ShieldCheck, Sparkles, WalletCards, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { startLogin } from "../const";

export function LoadingScreen({ label = "Opening your workspace" }: { label?: string }) {
  return <main className="loading-screen landing-loading" aria-live="polite" aria-busy="true">
    <div className="loading-orbit" aria-hidden="true"><span /><span /><span /></div>
    <div className="loading-wordmark"><span className="brand-mark"><span /></span><span>brightloop</span></div>
    <strong>{label}</strong>
    <span className="loading-detail">Reading your persisted billing workspace…</span>
  </main>;
}

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [launching, setLaunching] = useState(false);

  const openWorkspace = () => {
    setLaunching(true);
    window.setTimeout(() => setLocation("/workspace"), 620);
  };

  if (launching) return <LoadingScreen />;

  return <div className="landing-page">
    <header className="landing-nav">
      <Link href="/" className="landing-brand" aria-label="Brightloop home"><span className="brand-mark"><span /></span><span>brightloop</span></Link>
      <nav className={`landing-links ${menuOpen ? "landing-links-open" : ""}`} aria-label="Primary navigation">
        <a href="#workflow" onClick={() => setMenuOpen(false)}>How it works</a>
        <a href="#control" onClick={() => setMenuOpen(false)}>Control center</a>
        <a href="#trust" onClick={() => setMenuOpen(false)}>Trust</a>
        <button className="landing-nav-signin" onClick={() => startLogin()}>Sign in</button>
        <button className="landing-nav-close" aria-label="Close menu" onClick={() => setMenuOpen(false)}><X size={20} /></button>
      </nav>
      <div className="landing-nav-actions"><button className="landing-nav-signin desktop-only" onClick={() => startLogin()}>Sign in</button><button className="landing-cta landing-cta-small" onClick={openWorkspace}>Open workspace <ArrowRight size={15} /></button></div>
      <button className="landing-menu" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Menu size={21} /></button>
    </header>

    <main>
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <div className="eyebrow-pill"><span className="live-dot" /> Subscription operations, brought together</div>
          <h1>Billing that keeps its promises.</h1>
          <p className="landing-lede">Brightloop gives subscription teams one calm place to move from quotation to collection, with every handoff visible and every invoice accountable.</p>
          <div className="landing-hero-actions"><button className="landing-cta" onClick={openWorkspace}>Open the workspace <ArrowRight size={17} /></button><a className="landing-secondary-link" href="#workflow">See how it works <span>↓</span></a></div>
          <div className="landing-trust-line"><span><ShieldCheck size={16} /> Role-aware access</span><span><LockKeyhole size={16} /> Server-side records</span><span><Check size={16} /> No duplicate billing</span></div>
        </div>
        <div className="landing-hero-art" aria-label="Illustration of Brightloop billing workflow">
          <div className="art-glow art-glow-green" /><div className="art-glow art-glow-red" />
          <div className="billing-window">
            <div className="window-topline"><div className="window-controls"><i /><i /><i /></div><span>Brightloop / Reconciliation</span><span className="window-status"><span className="live-dot" /> Live records</span></div>
            <div className="window-body"><div className="window-heading"><div><span className="window-kicker">Workspace overview</span><strong>Make every month make sense.</strong></div><span className="window-avatar">B</span></div>
              <div className="signal-row"><div className="signal-card signal-green"><span>Billed</span><strong>Ready</strong><small>Invoices follow the subscription</small></div><div className="signal-card signal-red"><span>Exceptions</span><strong>Visible</strong><small>Overdue balances surface early</small></div></div>
              <div className="flow-card"><div className="flow-title"><span>Subscription lifecycle</span><span className="flow-caption">One source of truth</span></div><div className="flow-track"><div className="flow-step is-done"><span><Check size={13} /></span><small>Quotation</small></div><i /><div className="flow-step is-done"><span><Check size={13} /></span><small>Confirmed</small></div><i /><div className="flow-step is-live"><span><RefreshCw size={13} /></span><small>Active</small></div><i /><div className="flow-step"><span><CircleDollarSign size={13} /></span><small>Collected</small></div></div></div>
              <div className="mini-table"><div><span><FileText size={14} /> Invoice lifecycle</span><b className="mini-green">Tracked</b></div><div><span><WalletCards size={14} /> Payment allocation</span><b className="mini-red">Needs attention</b></div><div><span><BarChart3 size={14} /> Finance reporting</span><b className="mini-blue">Ready</b></div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-video-band" aria-labelledby="intro-video-title">
        <div className="video-copy"><span className="section-index">00 / THE INTRO</span><h2 id="intro-video-title">A clearer state of play.</h2><p>One short motion study for the hackathon story: the billing path moves from exception signals to a reconciled workspace.</p><span className="video-meta"><span className="live-dot" /> 0:05 product intro · silent by design</span></div>
        <div className="video-frame"><video src="/brightloop-hackathon-intro.mp4" autoPlay muted loop playsInline preload="metadata" aria-label="Brightloop subscription billing product intro" /><span className="video-frame-label">Brightloop / product motion</span></div>
      </section>

      <section className="landing-proof" id="control"><div className="proof-line"><Sparkles size={16} /><span>Designed for the moment finance, sales, and customers need the same answer.</span></div><div className="proof-grid"><div><strong>One continuous record</strong><span>Products, plans, subscriptions, invoices, and payments stay connected.</span></div><div><strong>Clear when it matters</strong><span>Paid, partial, unpaid, and overdue states are never hidden behind a spreadsheet.</span></div><div><strong>Quietly resilient</strong><span>Billing runs are idempotent, so a rerun never creates a duplicate invoice.</span></div></div></section>

      <section className="landing-workflow" id="workflow"><div className="section-intro"><span className="section-index">01 / THE FLOW</span><h2>From first conversation to clean books.</h2><p>Brightloop turns the full subscription lifecycle into a sequence your team can see, understand, and move forward.</p></div><div className="workflow-steps"><article><span className="step-number">01</span><FileText size={21} /><h3>Shape the offer</h3><p>Capture a customer, product, plan, quotation, and terms without losing the context behind the price.</p></article><article><span className="step-number">02</span><RefreshCw size={21} /><h3>Run the relationship</h3><p>Advance subscriptions through Draft, Quotation, Confirmed, Active, and Closed with valid next actions.</p></article><article><span className="step-number">03</span><CircleDollarSign size={21} /><h3>Reconcile the month</h3><p>Generate due invoices once, allocate partial payments safely, and give finance a reliable view of what remains.</p></article></div></section>

      <section className="landing-trust" id="trust"><div className="trust-card"><div className="trust-orbit"><LockKeyhole size={24} /></div><div><span className="section-index">02 / BUILT WITH CARE</span><h2>Trust is an interaction detail.</h2><p>People should know what will happen before they press the button. Brightloop keeps role boundaries, payment state, customer visibility, and billing outcomes explicit.</p><div className="trust-list"><span><Check size={15} /> Customer records stay scoped</span><span><Check size={15} /> Invoice totals preserve their source lines</span><span><Check size={15} /> Audit-ready changes have a visible trail</span></div></div></div><div className="trust-side"><span className="trust-side-label">The Brightloop point of view</span><strong>Make the important state impossible to miss.</strong><span>Green means the record is moving. Red means the team can act. Everything else gets out of the way.</span></div></section>

      <section className="landing-final"><div><span className="section-index">03 / READY WHEN YOU ARE</span><h2>Open the workspace.<br /><em>See what is true.</em></h2></div><button className="landing-cta" onClick={openWorkspace}>Open Brightloop <ArrowRight size={17} /></button></section>
    </main>
    <footer className="landing-footer"><span>brightloop</span><span>Subscription operations for calmer teams.</span><span>© {new Date().getFullYear()} Brightloop Software</span></footer>
  </div>;
}

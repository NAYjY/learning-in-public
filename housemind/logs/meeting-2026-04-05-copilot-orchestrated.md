# Meeting Log

**Date:** 2026-04-05
**Model:** Claude Opus 4.6 (via Copilot Chat)
**Topic:** A platform for architects, contractors, homeowners, and suppliers to get on the same page about building materials — especially products not available locally.

---

## Round 1

### Head of Marketing
The positioning here is everything. We're not building "another marketplace" — we're solving a trust and alignment problem. When an architect specifies Italian porcelain tiles and the homeowner has no idea what they look like installed, and the contractor can't source them locally — that's our gap. I'd position this as "the shared workspace for building decisions." Monetization should come from suppliers paying for premium listings and visibility, not from charging the people making decisions.

Who are we onboarding first? Because if we try to go after all four user types at once, we'll dilute our message and burn acquisition budget.

### Head of Operations
Marketing's right that we can't chase everyone at once, but here's the ground truth: without suppliers uploading products, there's nothing for anyone else to look at. The cold start problem is real. We need a curated seed catalog — maybe 500-1000 products across key categories — before we let architects or homeowners in. I'd start by partnering with 5-10 suppliers who already have digital catalogs and can export product data easily.

But who's verifying that product data is accurate? Who handles it when a supplier lists something as "available" but it takes 12 weeks to ship? Trust breaks fast in construction.

### Head of Tech
Ops is right about the seed catalog — and the good news is that's a solvable problem without heavy engineering. A basic product ingestion pipeline (CSV upload + image hosting) gets us to v1. The real technical question is the collaboration layer. Do we build a simple shared board where parties comment on products, or do we go deeper with project-based workspaces where you track decisions per room, per spec? I'd advocate for the simple board first — it's a week of work vs. a month.

Can we agree on the MVP scope before we talk about who to target? Because the user we choose changes what we build first.

---

## Round 2

### Head of Marketing
Tech's right — scope drives targeting and vice versa. Here's my take: launch with architects as the entry point. They're the ones who specify materials, they influence every other party, and they have the professional pain of clients changing their minds because they "didn't realize that's what it would look like." Give architects a tool to create visual material boards and share them with clients. Suppliers benefit passively — their products get showcased. Contractors get pulled in when the architect shares a board for feasibility.

One tool, one workflow, one user to acquire. Can ops make that onboarding path work?

### Head of Operations
Architect-first works, but we need to be honest about what "onboarding an architect" actually means. They're busy, skeptical of new tools, and won't switch unless it saves them real time. The onboarding flow needs to be: sign up, search a product, drag it to a board, share a link — under 5 minutes. No training, no demo calls. If it takes longer than that, they'll bounce.

My concern: we need enough product variety in the catalog that architects actually find what they're specifying. If they search for "matte black hardware" and get zero results, we've lost them forever. How do we ensure catalog depth before launch?

### Head of Tech
For catalog depth without waiting on suppliers, we can scrape publicly available product data from manufacturer websites — images, specs, dimensions — and build a "reference catalog" that architects can browse and pin. When a supplier later claims their listing, they upgrade it with pricing, availability, and ordering. This is how Zillow bootstrapped listings before agents joined. It's a crawl-walk-run approach.

Technically: Next.js frontend, Postgres for products and boards, S3 for images, simple auth. We could have an MVP in 3-4 weeks. Should we scope the board as "per project" or "per architect portfolio"?

---

## Round 3

### Head of Marketing
Per project, not portfolio. The sharing moment is the growth engine — an architect creates a board for "The Johnson Renovation," shares it with the homeowner and contractor, and suddenly three users see the platform from one architect action. Portfolio is a vanity feature. Project boards are viral. Every share is an acquisition opportunity.

Also — the reference catalog idea is smart for bootstrapping, but marketing needs to be transparent about it. We can't have users thinking they can order something that's just a reference listing. Clear labeling: "reference product" vs. "available from supplier." Otherwise trust dies on day one.

### Head of Operations
Agreed on transparency labeling — that's non-negotiable. I'd add a "request availability" button on reference products. When enough architects request the same product, that's our signal to recruit that supplier. It's demand-driven onboarding — we're not cold-calling suppliers, we're showing them "47 architects want your product on our platform." That's a powerful pitch.

Workflow-wise: architect creates project board, adds products, shares link. Homeowner views and comments ("love this, hate that"). Contractor flags feasibility ("this tile needs special adhesive, adds $2K"). Everyone's on the same page. That's the core loop.

Tech — is the commenting and role-based view straightforward, or does it add significant complexity?

### Head of Tech
Role-based views with commenting is moderate complexity — maybe adds a week to the MVP. Each user type sees the same board but with different actions: architects add/remove products, homeowners react (thumbs up/down + comments), contractors flag logistics concerns. Under the hood it's just a permissions layer on the board entity. I'd say it's worth it — without it, the board is just a mood board, not a collaboration tool.

The scraping pipeline for the reference catalog is the riskier piece. Some manufacturer sites are messy. I'd suggest we start manually curating 200-300 products in our target categories to launch, then build the scraper as a v2 feature. Can we align on which product categories to seed first?

---

## Round 4

### Head of Marketing
Seed with the categories that cause the most "lost in translation" moments: tiles and flooring, kitchen fixtures and hardware, lighting, and exterior cladding. These are visual, high-stakes decisions where homeowners and architects frequently disagree because they're looking at different references. If we nail the board experience for tiles alone, we have a wedge.

For launch, I want 10 architect beta users who'll give us real feedback. I can recruit them through architecture forums and Instagram — that community is tight and vocal. If they love it, word spreads fast.

### Head of Operations
Tiles, fixtures, lighting, cladding — that's a good starting set. I can manually curate those categories from manufacturer catalogs in about a week. For the beta, we need a feedback loop baked in: a simple "report issue" or "missing product" button so we learn what's missing fast.

One open question: do we handle pricing in v1? Contractors care about cost deeply, and homeowners get sticker shock. But pricing data is messy — it varies by region, quantity, and supplier. I'd say skip exact pricing for now and just show "price range" or "$$/$$$" indicators. Thoughts?

### Head of Tech
Skip exact pricing for MVP — it's a rabbit hole. Price ranges or tier indicators ($/$$/$$$) are enough to keep decisions grounded without requiring real-time supplier pricing feeds. We can add actual pricing when suppliers onboard and manage their own listings.

So here's the MVP scope I'm hearing: Next.js app, product catalog (manually curated, ~300 products in 4 categories), project boards with sharing, role-based commenting (architect/homeowner/contractor), reference vs. available labeling, and a "request availability" button. Auth, basic search with filters. No pricing feeds, no Revit integration, no supplier dashboard yet. That's a tight 4-week build.

Are we aligned, or is anything missing before PM wraps this up?

---

## PM Summary

**What the team agreed on:**
- Architect-first strategy — they're the entry point, and sharing project boards pulls in homeowners and contractors organically
- Bootstrap the catalog with ~300 manually curated reference products in 4 categories: tiles/flooring, kitchen fixtures/hardware, lighting, and exterior cladding
- MVP is a project board tool: create board, add products, share link, role-based commenting
- Clear "reference" vs "available" product labeling to maintain trust
- "Request availability" button to drive demand-based supplier recruitment
- Skip exact pricing (use $/$$/$$$), skip Revit integration, skip supplier dashboard — all Phase 2
- 4-week build target with Next.js, Postgres, S3

**What's still unresolved:**
- How to recruit the first 10 architect beta users and what success criteria looks like for the beta
- When to start the scraping pipeline vs. staying manual
- Revenue model timing — when do we approach suppliers about paid listings?

**Founder question:** Should we launch the beta as invite-only to a small architect group and iterate quietly, or go public from day one to maximize early signal — even if the catalog is thin?

---

## Founder Direction

> Invite-only beta. Our co-owner has a personal list of architects — he'll invite them himself.

---

## Team Response to Founder Direction

### Head of Marketing
Perfect. Personal invites from a co-owner are worth 100x any cold outreach. That's not marketing — that's trust. These architects will feel like insiders, not users. Framing: "We're building something for how you actually work — and we want you to shape it." No landing page, no waitlist theater. Just a direct message, a link, and an ask for honest feedback.

After each architect tries it, schedule a 15-minute listening session. Not a demo — just questions: What did they search for? What was missing? What would make them use it on a real project? That qualitative data is gold before we have any analytics.

### Head of Operations
This solves the cold start problem beautifully. If the co-owner knows these architects personally, we can ask them *before* launch: "What products are you specifying right now?" Then we seed the catalog with exactly those products. Instead of guessing which 300 items to curate, we curate the 50-100 products these specific architects actually need this month. The catalog feels tailor-made because it literally is.

Operationally: prepare a simple onboarding checklist for each invited architect — account created, first board made, first share sent. Track who completes each step and where they drop off. That tells us exactly what to fix.

### Head of Tech
Invite-only simplifies the tech too. No public sign-up flow, no email verification spam, no abuse prevention — just a simple invite code or magic link system. Each architect gets a unique link from the co-owner, clicks it, sets a password, and they're in. A day of work instead of a week on general auth.

Adding a persistent feedback widget — a small "flag" button on every screen that lets them report issues or request products inline, tagged to exactly where they were in the app. That feeds directly into our backlog.

---

## Updated Action Plan

### Phase 1: Pre-launch (Week 1-2)
- Co-owner reaches out to architect list — they are beta users (no pre-feedback on product lists, they just use the platform)
- Ops curates catalog independently (~100-150 products in target categories)
- Tech builds: invite-token auth, product catalog, project board, share links

### Phase 2: Build (Week 2-4)
- Role-based commenting (architect/homeowner/contractor views)
- "Reference" vs "available" product labels
- "Request availability" button
- Inline feedback widget
- Basic search with category filters

### Phase 3: Beta launch (Week 5)
- Co-owner sends personal invite links to architect group
- Track onboarding funnel: invite opened → account created → first board → first share
- 15-min feedback calls after first week of use

### Success criteria for beta
- 5+ architects create real project boards (not test ones)
- 3+ boards get shared with a homeowner or contractor
- Clear signal on what product categories to expand next

### Deferred to later phases
- Public sign-up, supplier dashboard, pricing feeds, Revit integration, scraping pipeline

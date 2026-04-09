
**[2026-04-06T00:00:50] You:** form report you need my feedback on catalog. It absolutely will grow and need filter. what else how could we grow up. Notification for in-app. Budget how much do you need? why Landing page need specific budget?

**[2026-04-06T00:00:50] PM:** Got it. Here’s the breakdown:

### **To Address Catalog Growth**:
1. **Advanced Filtering** (P0): Build a multi-faceted filtering system for category, material, price range, style, color, brands, and availability (reference vs available). This supports scalability as the catalog grows beyond 150 products.
   - **Why?** With increased volume, architects will need precision to quickly find relevant products. This is crucial for usability and engagement.

2. **Tag Management System** (P1): Develop admin tools for tag creation and management. This allows flexible taxonomy for growth, especially as new categories or trends emerge. Example: Create tags for new product styles/collections dynamically.
   - **Why?** Manual static filters won’t scale. Tagging enables operational flexibility without bottlenecks.

---

### **In-App Notifications**:
**Implementation (P2)**:
1. Notification types:
   - Comments tagged to a user on boards.
   - Updates to a product’s “availability” status.
   - Feedback acknowledgment (important for operational transparency).
2. Budget-friendly option: Local polling for MVP. Scale later to real-time push notifications using Firebase or WebSockets.
   - **Why?** Drives timely collaboration and re-engagement without high upfront complexity.

---

### **Budget**:
1. **Catalog Expansion (P0)**:  
   **Estimated cost:** $20K-$30K  
   - Includes backend development for filters, admin tools, advanced tagging.
   - UI/UX design for intuitive filters.  
   - Sourcing and curating high-quality visuals and descriptions for 150 products.

2. **Landing Page (P0)**:  
   **Budget Estimate: $8K-$12K**  
   - **Why?** Critical first impression for architect-first strategy:
     - Expanding copy to articulate our collaborative value proposition with visuals (mock-up of project boards).
     - Showcase key features (role-based comments, request availability buttons, etc.) dynamically.
     - SEO optimization for early traction and future growth campaigns.

3. **In-App Notifications (P2)**:  
   **Budget Estimate: $10K-$15K**  
   - Start with basic polling for the MVP.
   - Build modularly for eventual real-time or push notifications.

---

### **What Else Could We Do to Grow?**:
1. **Seed Example Projects (Marketing Initiative)**:
   - Create 3-5 curated project board templates (e.g., “Modern Home,” “Rustic Retreat”).
   - Pre-populate with ideal product categories for easy inspiration and adoption.
   - **Goal:** Get architects engaged with boards immediately. 

2. **Platform Analytics Dashboard**:
   - Allow architects to see engagement metrics for their boards (views, comments, etc.).
   - **Goal:** Provide architects feedback loops to share their designs and get responses faster.

3. **Integrations**:
   - Long-term plan: Integrate with BIM tools like Revit or SketchUp for architects to import/export plans.

Let me know which ones to prioritize further!

**[2026-04-06T00:04:57] You:** feedback widget ntegrate with user actions

**[2026-04-06T00:04:57] PM:** Got it! Here’s how we could enhance the **feedback widget** to integrate with user actions:

### **Feedback Widget Integration Plan**

#### **Objective:**
Enable real-time feedback collection tied to specific user actions for continuous improvement and customer insights that align with the platform’s workflow.

---

### **Action Integration Points:**
1. **Catalog Interaction (P0):**
   - Trigger widget engagement after a user performs key actions:
     - Pins a product to a board.
     - Uses filters but finds zero results.
     - Clicks the ‘Request Availability’ button.
   - Question examples:
     - “Did you find the product you were looking for?”
     - “What additional filters do you need to find suitable options?”

2. **Project Board Actions (P1):**
   - Trigger feedback widget after a user creates a project board or shares it for the first time.
   - Question examples:
     - “Anything that could improve your experience managing a board?”
     - “Was the sharing process clear?”

3. **Invite and Onboarding Flow (P1):**
   - Prompt after the invite acceptance or account creation.
   - Question examples:
     - “What brought you to HouseMind?”
     - “Any feedback on your onboarding experience? Was anything confusing?”
   - This part could also support Marketing efforts to refine messaging for landing pages and supporting materials.

---

### **Technical Implementation:**
1. **Widget Triggers:**
   - Add hooks to detect these user actions (already tracked via onboarding events APIs).
   - Pass action-specific identifiers to the widget (e.g., `action_type: product_pinned` or `action_type: board_created`).

2. **Data Routing:**
   - Extend feedback API to tie feedback submissions to action context (e.g., product ID, board ID, action_type).
   - Store feedback in an enriched `feedback` table in Postgres.

3. **UI Enhancements:**
   - Make feedback widget contextual:
     - For catalog actions, auto-fill product name in feedback form.
     - For project boards, auto-fill board ID.
   - Simplify submission flow for non-intrusive experience. Auto-close on submit.

---

### **Why This is Critical:**
1. Align feedback collection with user behavior, delivering actionable insights tied to specific platform workflows.
2. Reduce friction during feedback submission by pre-filling context—the user spends less time explaining.
3. Helps us identify platform roadblocks tied to prioritized features (catalog, onboarding, notifications).

---

### **Budget:**  
**Estimated Cost:** $12K-$18K  
- **Breakdown:**
  - Frontend work for integrated hooks and contextual UI changes in the widget.
  - Backend updates to support enriched feedback event tracking.

Let me know if we want to greenlight this! Drafting specs can start immediately.

**[2026-04-06T08:36:46] You:** how all going

**[2026-04-06T08:36:46] PM:** Here's the full status picture:

---

### **Overall: On Track, But Execution Phase Is Critical**

---

### **Tech ✅**
- Architecture decision made: **Progressive disclosure** on `/projects/[id]` — single workspace, no URL fragmentation
- Annotation system spec locked: carousel → long-press → emoji pin → product link → product panel
- **6-8 week timeline confirmed** with:
  - Derived state management
  - 10-sec polling + optimistic UI
  - Contextual first-use tutorial
  - Emoji usage tracking built in
- **Waiting on:** Circular emoji menu mockup review before component gets locked

---

### **Marketing ✅**
- Aligned on architect-first positioning
- Beta comms plan ready: personalized onboarding emails, private Slack/Discord for feedback
- **Waiting on:** Ops to confirm 5 beta projects + participant names
- Wants weekly UI sync during build before components lock

---

### **Operations 🟡**
- Identified gaps: no admin product management interface, no invite dashboard
- Beta project selection criteria defined: **5 projects × 3 collaborators = 15 core users**
- **Blocking Tech:** Project structures needed by end of week for seed data

---

### **Open Items Needing Your Input:**
| Item | Owner | Status |
|------|-------|--------|
| Catalog filters + tag system | Tech + Ops | Needs greenlight |
| Feedback widget with action hooks | Tech | Needs greenlight |
| In-app notifications | Tech | P2, not started |
| Landing page budget ($8-12K) | Marketing | Awaiting approval |
| Admin product management tool | Tech + Ops | Needs greenlight |
| Beta project structures | Ops | Due end of week |
| Emoji menu mockup review | Design + Marketing | Blocking Tech |

---

### **Biggest Risk Right Now:**
**Ops hasn't confirmed beta projects.** Tech needs this to seed realistic test data. If this slips past end of week, it pushes the build timeline.

What do you want to unblock first?

**[2026-04-07T02:41:10] You:** FOUNDER: Resource allocation decision blocks all timelines. what is it

**[2026-04-07T02:41:10] PM:** ### **The Resource Allocation Problem — Plain English**

---

**Right now, Tech has one team and three departments all assuming they're Wave 1 priority.**

---

### **What Each Department Wants Built Now:**

| Department | What They Want | Effort |
|------------|---------------|--------|
| **Tech** | Core board + annotation system (`/projects/[id]`) | 60% of total app complexity |
| **Operations** | 5 admin tools (invite dashboard, product manager, analytics) | Medium-large |
| **Marketing** | Onboarding checklists, walkthroughs, drip emails, landing page | Medium |

**There is only one Tech team. All three assume Wave 1. Something has to give.**

---

### **The Three Choices:**

**Option A — Focus**
Tech builds ONLY the core board + annotation system. Everything else waits.
- ✅ Best product, fastest to beta
- ❌ Ops manages invites manually. No onboarding automation.

**Option B — Split**
Tech splits focus across board + minimum admin tools + basic onboarding.
- ✅ More operational support at launch
- ❌ Everything takes longer, annotation quality suffers

**Option C — Parallel Track**
Hire or contract additional resource for admin tools + landing page while core team stays on board.
- ✅ No tradeoffs
- ❌ Costs money, requires coordination

---

### **PM Recommendation:**
**Option A with manual fallback.**
- Tech ships core board experience only
- You personally onboard first 5 architects by phone/Zoom
- Ops manages invites via spreadsheet temporarily
- Admin tools become Wave 2 sprint 1

**Beta is 15-20 users. You don't need automation yet. You need a great product.**

---

**Your call. Which option?**

**[2026-04-07T02:43:30] You:** Hire or contract additional resource for admin tools + landing page. what is that

**[2026-04-07T02:43:30] PM:** ### **Option C — What "Hire or Contract" Actually Means**

---

### **The Two Resources Needed:**

---

#### **1. Admin Tools Developer**
**What they build:**
- Invite dashboard (see who's been invited, resend, revoke)
- Product management interface (add/edit/delete catalog items, upload images, manage tags)
- Basic analytics view (who's active, what's being pinned, emoji usage)

**Who you hire:**
- 1 contract fullstack developer (Next.js + PostgreSQL)
- Part-time or project-based engagement

**Timeline:** 4-6 weeks parallel to core Tech team
**Estimated Cost:** **$8K-$15K** depending on scope and rate

---

#### **2. Landing Page Designer/Developer**
**What they build:**
- Hero section with clear value proposition for architects
- Feature showcase (boards, annotations, product linking)
- SEO foundation
- Invite request form

**Who you hire:**
- 1 contract frontend developer OR a small design+dev studio
- Could be the same person as above if fullstack

**Timeline:** 2-3 weeks
**Estimated Cost:** **$8K-$12K**

---

### **Total Estimated Cost: $16K-$27K**

---

### **What This Buys You:**
| Without Contracting | With Contracting |
|---------------------|-----------------|
| Core team distracted | Core team 100% on annotation system |
| Admin tools in Wave 2 | Admin tools ready at beta launch |
| No landing page at launch | Professional first impression |
| Manual ops from day one | Ops has real tools |

---

### **What You Need to Decide:**
1. **Budget approved?** $16K-$27K range
2. **Who sources the contractor?** You directly, or does Ops/Tech screen candidates?
3. **Who manages them?** They need a point of contact — likely Head of Tech for admin tools, Head of Marketing for landing page

---

**This is the cleanest path if budget allows. Want to greenlight it?**

**[2026-04-07T02:46:07] You:** result of Option B and C us same?

**[2026-04-07T02:46:07] PM:** **Honest answer: Yes, largely the same outcome — but the path is different.**

---

### **Why They Look Similar:**

Both options result in:
- Core board + annotation system built
- Admin tools exist at beta launch
- Landing page ready

---

### **The Real Difference:**

| | Option B | Option C |
|--|----------|----------|
| **Who builds admin/landing** | Same core Tech team | Separate contractor |
| **Annotation system quality** | Diluted — team is split | Full focus — team stays on board |
| **Timeline** | Everything slips 2-4 weeks | Parallel tracks, no slip |
| **Cost** | Just salaries you're already paying | +$16K-$27K extra |
| **Risk** | Annotation quality suffers | Coordination overhead |

---

### **The Core Tradeoff:**

**Option B** pays with **time and quality.**
**Option C** pays with **money.**

---

### **Which Matters More Right Now?**

The annotation system **is the product.** It's your differentiation. It's what architects will judge you on in beta.

If annotation quality gets diluted because your Tech team is also building admin dashboards — **you've spent nothing extra but damaged the thing that matters most.**

---

### **PM Recommendation:**
If budget allows even $16K — **Option C is the better investment.**

Admin tools are commodity work. Annotation UX is not.

**Do you have the budget?**

**[2026-04-07T02:48:58] You:** i would create a new team for that optionC in stead of contract. give me roles and decription as [const BASE_CONTEXT = `HouseMind — a platform connecting architects, contractors, homeowners, and suppliers to visualize and agree on building products for house projects.]



**[2026-04-08T03:12:11] You:** do you think we could make it in pyhton instead of Node.js? tell me  pro and con. you ask ask tech

**[2026-04-08T03:12:11] PM:** Here's the honest breakdown, then the question for Tech:

---

### **Python vs Node.js for HouseMind**

---

#### **Pros of Switching to Python:**

| Area | Benefit |
|------|---------|
| **Scraping** | BeautifulSoup + Scrapy + Playwright are best-in-class. Role 5 (Integrations & Scraping) would be significantly stronger |
| **Data pipelines** | Supplier data imports, catalog management — Python handles this more naturally |
| **AI/ML future** | If HouseMind ever does product recommendations, image recognition, or smart filtering — Python ecosystem wins |
| **Developer pool** | Large talent pool, often cheaper to hire |
| **Readability** | Cleaner code for backend logic, easier to onboard new team members |

---

#### **Cons of Switching to Python:**

| Area | Problem |
|------|---------|
| **You already have a Next.js codebase** | Everything built so far — 23 passing tests, 7 tables, all API routes — is Node.js. A switch means rewriting from scratch |
| **Frontend stays Next.js regardless** | You cannot run React/Next.js in Python. You'd have two separate codebases to maintain |
| **Two languages = two teams** | Core Team (Node.js frontend) + Python backend = coordination overhead, context switching, more hiring complexity |
| **Timeline** | Rewrite adds minimum 4-6 weeks. Kills your 6-8 week beta window |
| **Vercel deployment** | Your stack is optimized for Vercel. Python backend needs separate hosting (Railway, Render, AWS) — more infrastructure overhead |
| **Real-time polling** | Node.js handles concurrent connections more efficiently for the 10-second polling pattern already designed |

---

### **Honest PM Take:**

**Don't switch the whole backend to Python.**

But there's a smarter middle path:

```
Option: Hybrid Microservice

Keep Next.js for everything it's good at:
- Frontend
- Auth
- Project/annotation APIs
- Real-time polling

Add ONE Python microservice for what it's genuinely better at:
- Product URL scraping
- Supplier data imports
- Future: recommendations engine

Cost: 1 additional service to deploy
Benefit: Best tool for each job
Timeline impact: Minimal — Role 5 works in Python independently
```

---

### **Question for Tech Lead:**

```
Given our current Next.js + PostgreSQL codebase:

1. How painful would full Python migration actually be 
   in your honest estimate — weeks or months?

2. For the scraping service specifically — are you 
   comfortable building it in Python as a standalone 
   microservice that the Next.js API calls internally?

3. Any performance concerns with Node.js handling 
   20+ concurrent annotations on mid-range mobile 
   that Python would solve better?

We are not rebuilding. But we want your real opinion 
before locking Role 5's stack.
```

---

**Want me to assign this question as a ticket to Tech Lead?**

**[2026-04-08T03:15:19] You:** no dont ask them base on what we have in app. ask them as we start new.

**[2026-04-08T03:15:19] PM:** Got it. Fresh start question — no existing codebase bias.

---

### **Question for Tech Lead:**

```
HouseMind — a platform connecting architects, contractors, 
homeowners, and suppliers to visualize and agree on building 
products for house projects.

We are starting from zero. No existing code. Clean slate.

THE PRODUCT WE ARE BUILDING:
- Annotation workspace (long-press → emoji pin → product link)
- Image carousel (swipe, multi-image per board)
- Product catalog (filter, tag, request availability)
- Product URL scraper (paste URL → extract images/title/price)
- Role-based collaboration (architect, contractor, homeowner, supplier)
- Hierarchical projects (main → subprojects)
- 10-second polling for real-time feel
- Invite-only auth with magic links
- Mobile-first (Samsung A series, iPhone SE, iPad)
- Thai + English support
- ONE workspace, no URL fragmentation

USERS:
- Architects (power users, high visual standards)
- Contractors (mobile, job sites, bad signal)
- Homeowners (visual, non-technical)
- Suppliers (product-focused)

SCALE:
- Beta: 15-20 users
- Year 1 target: ~500 users
- Invite-only growth

THE QUESTION:
If you were starting this today from scratch —
would you choose Python (FastAPI/Django) + React 
or Node.js (Next.js) as the full stack?

ANSWER THESE SPECIFICALLY:

1. Which stack gives us the best mobile performance 
   for annotation-heavy interactions on mid-range devices?

2. Which stack handles product URL scraping better 
   natively without a separate microservice?

3. Which stack is faster to hire for at senior level 
   in a market where we also need Thai language support?

4. Which stack gives us the cleanest path to AI features 
   later — product recommendations, image recognition, 
   smart filtering?

5. What is your honest recommendation and why?

We want your real opinion. Not the safe answer.
```

---

**Want to assign this as a ticket to Tech Lead now?**



**[2026-04-08T03:20:00] PM:** ```
Hi [Tech Lead name],

Quick question before we lock the stack and start hiring.
We're treating this as a clean slate — no existing code bias.

─────────────────────────────────────────
WHAT WE ARE BUILDING
─────────────────────────────────────────
- Annotation workspace (long-press → emoji pin → product link)
- Image carousel (swipe, multi-image per board)
- Product catalog (filter, tag, request availability)
- Product URL scraper (paste URL → extract images/title/price)
- Role-based collaboration (architect, contractor, homeowner, supplier)
- Hierarchical projects (main → subprojects)
- 10-second polling for real-time feel
- Invite-only auth with magic links
- Mobile-first (Samsung A series, iPhone SE, iPad)
- Thai + English support

USERS: Architects, Contractors, Homeowners, Suppliers
SCALE: 15-20 beta users → ~500 Year 1

─────────────────────────────────────────
THE QUESTION
─────────────────────────────────────────
If you were starting this today from scratch —
would you choose:

A) Python (FastAPI) + React frontend
B) Node.js (Next.js) full stack

Please answer these specifically:

1. Which stack gives better mobile performance for 
   annotation-heavy interactions on mid-range devices 
   (Samsung A series, iPhone SE)?

2. Which stack handles product URL scraping better 
   natively without needing a separate microservice?

3. Which stack is faster to hire for at senior level —
   especially considering we may need Thai-speaking 
   developers?

4. Which stack gives the cleanest path to AI features 
   later — product recommendations, image recognition, 
   smart catalog filtering?

5. What is your honest recommendation and why?

We want your real opinion. Not the safe answer.
We are making the hiring decision based on your response.

─────────────────────────────────────────
```

Copy and send as is. Bring the answer back here and we'll make the call together.


**[2026-04-08T05:17:37] You:** new tech  decrpt for me to fit now work A) Python (FastAPI) + React frontend. now tech is

**[2026-04-08T05:17:37] PM:** Got it — you want the updated Head of Tech description rewritten for the new stack:

**Python (FastAPI) + React frontend**

Just confirm a few things so I write it accurately:

1. **Database** — still PostgreSQL or changing?
2. **Frontend** — React alone or Next.js (React framework)?
3. **Hosting** — still Vercel or moving (since FastAPI doesn't run on Vercel natively)?

Quick answers and I'll write it immediately.

**[2026-04-08T05:19:25] You:** still PostgreSQL ,React alone or Next.js (React framework) i dont know enoghe detail, hosting move to more suitable

**[2026-04-08T05:19:25] PM:** Good. Let me answer the React vs Next.js question for you first, then I'll write the description.

---

### **React alone vs Next.js with FastAPI backend:**

```
NEXT.JS + FASTAPI
- Next.js handles frontend only (no API routes)
- FastAPI handles all backend/API
- Clean separation — frontend team and backend team 
  never step on each other
- Next.js still gives you routing, SSR, image optimization
- Hosted separately: Vercel (frontend) + Railway (FastAPI)
- This is the standard professional setup for this stack

REACT ALONE + FASTAPI  
- More manual setup (you configure routing yourself)
- No SSR out of the box (slower initial page load)
- No image optimization built in
- More flexible but more work
- Only choose this if you have strong React engineers 
  who prefer full control

RECOMMENDATION: Next.js + FastAPI
- Best of both worlds
- Your frontend engineers already know Next.js patterns
- FastAPI handles scraping, annotations, auth, database
- Clean handoff between teams
```

---

**My recommendation: Next.js (frontend) + FastAPI (backend) + PostgreSQL**

**Hosting: Vercel (frontend) + Railway (FastAPI backend)**

---

Confirm this and I'll write the full updated Head of Tech description now.

**[2026-04-08T05:26:03] You:** go with your recommend. and Noted that we already have a python system engineer to handle project after all finish





**[2026-04-08T05:48:42] You:** let continue ourconversation

**[2026-04-08T05:48:42] PM:** Sure. Where do you want to pick up?

Here's where we left off:

```
✅ Stack decided: Next.js + FastAPI + PostgreSQL
✅ Hosting: Vercel (frontend) + Railway (backend)
✅ Python Systems Engineer handles infra post-launch
✅ Head of Tech description updated for new stack
⬜ Sub-agent descriptions not yet updated
```

Options:
1. **Update sub-agent descriptions** to match new stack
2. **Start the tech team run** with the new description
3. **Something else**

What's next?

**[2026-04-08T05:53:47] You:** "new tech  decrpt for me to fit now work A) Python (FastAPI) + React frontend. now tech is\n  tech: {\n    name: \"Head of Tech\",\n    system: `You are the Head of Technology for HouseMind — a platform connecting architects, contractors, homeowners, and suppliers to visualize and agree on building products for house projects.\nContext from leadership meeting:\n- Architect-first strategy. Invite-only beta — co-owner personally invites architect beta users.\n- MVP: Next.js app, Postgres, S3. Project boards with sharing, role-based commenting, product catalog.\n- Curated reference catalog (~100-150 products in tiles, fixtures, lighting, cladding).\n- Invite-token auth (magic links). Inline feedback widget.\n- Phase 1 skip: pricing feeds, Revit integration, supplier dashboard, scraping.\n"

**[2026-04-08T05:53:47] PM:** Got it. Let me decode what you're asking:

---

## **What You're Describing**

You have a **new tech description** and you're asking whether to:

**A) Switch to Python (FastAPI) + React**

vs.

**B) Stay with the current stack:**
- Next.js (frontend + API routes)
- PostgreSQL
- S3
- JWT auth

---

## **My Take: Stay with Next.js (Option B)**

Here's why this isn't a close call right now:

| Factor | FastAPI + React | Next.js (current) |
|---|---|---|
| Build speed | Slower — two separate apps | Faster — one codebase |
| Team context | Would need re-onboarding | Already built 23 passing tests |
| Timeline risk | High — 6-8 week MVP | Low |
| Mobile-first | Same | Same |
| Thai + English i18n | Same | Same |

**You are 6-8 weeks from MVP launch.** Switching stacks now means:
- Rewriting the auth system (invite tokens, JWT)
- Rebuilding 7 DB tables worth of API logic
- Re-testing everything from scratch
- Losing momentum on the annotation system (which is the core product)

---

## **When FastAPI Would Make Sense**

If you told me:
- The annotation system needs heavy ML/computer vision (Python ecosystem)
- You have a backend team that only knows Python
- You're post-MVP and rebuilding for scale

Then yes, FastAPI is worth it. **Not now.**

---

## **My Recommendation**

Stay on Next.js. If there's a specific reason someone is pushing for FastAPI — bring that reason here and I'll pressure-test it.

What's driving the question?

**[2026-04-08T05:56:19] You:** i want description for setting head of tech. the one i just gave you is old one. if you see in past conversation we agree on pythonfastapi+node.js(react framework)

**[2026-04-08T05:56:19] PM:** Got it — you're right to flag that. Let me be honest:

---

## **What I Can See**

In the department reports and meeting logs loaded into this session, the stack listed is:

> **Next.js 16 + TypeScript + Tailwind CSS + PostgreSQL + JWT auth**

I do **not** have a record in this session of us agreeing to switch to **Python (FastAPI) + Node.js/React**.

That conversation may have happened in a **previous session** — which I can't access. I only remember within this current chat.

---

## **So I Need You to Confirm the Agreed Stack**

Tell me what we decided and I'll write the new Head of Tech system prompt around it:

1. **Backend:** Python (FastAPI) — confirmed?
2. **Frontend:** React (with which framework — plain React, Next.js, Vite?)
3. **Database:** Still PostgreSQL?
4. **Storage:** Still S3?
5. **Auth:** Still JWT / invite tokens?
6. **Anything else that changed?**

---

Once you confirm, I'll rewrite the Head of Tech description to match the new stack cleanly. Takes me 2 minutes once I have the right info.

**[2026-04-08T05:58:16] You:** Next.js (frontend) + FastAPI (backend) + PostgreSQL Vercel (frontend) + Railway (FastAPI backend)

**[2026-04-08T05:58:16] PM:** Perfect. Here's the new Head of Tech system prompt:

---

## **Head of Tech — System Prompt (Updated)**

```
You are the Head of Technology for HouseMind — a platform 
connecting architects, contractors, homeowners, and suppliers 
to visualize and agree on building products for house projects.

STACK:
- Frontend: Next.js (React framework) — deployed on Vercel
- Backend: FastAPI (Python) — deployed on Railway
- Database: PostgreSQL
- Storage: S3
- Auth: JWT invite-token system (magic links)

ARCHITECTURE:
- Next.js handles all UI, routing, and frontend logic
- FastAPI handles all API endpoints, business logic, and DB access
- PostgreSQL is the single source of truth
- Frontend calls FastAPI via REST API

CONTEXT FROM LEADERSHIP:
- Architect-first strategy
- Invite-only beta — co-owner personally invites architect beta users
- Mobile-first (Samsung A series, iPhone SE, iPad)
- Thai + English support
- ONE workspace per project

MVP SCOPE (Phase 1, 6-8 weeks):
- Image carousel with reference images
- Emoji annotation system (long-press → 8 emoji types → pin at x,y%)
- Product linking (tap pin → paste URL → scrape images → pick one)
- Product panel filtered by active pins
- Hierarchical projects (main → subprojects)
- Role-based access: Architect, Contractor, Homeowner, Supplier
- Role-colored comments

PHASE 1 SKIP:
- Pricing feeds
- Revit integration
- Supplier dashboard
- Automated scraping pipelines

CONSTRAINTS:
- Mobile-first performance on mid-range devices
- Annotation IS the core product — prioritize it
- Invite-only beta, no public signup
```

---

Want me to also update the other department prompts (Marketing, Ops) to reflect the new stack where relevant?

**[2026-04-08T05:58:46] You:** yep

**[2026-04-08T05:58:46] PM:** Here are all three updated department prompts:

---

## **Head of Marketing — System Prompt (Updated)**

```
You are the Head of Marketing for HouseMind — a platform 
connecting architects, contractors, homeowners, and suppliers 
to visualize and agree on building products for house projects.

PLATFORM CONTEXT:
- Stack: Next.js frontend (Vercel) + FastAPI backend (Railway) + PostgreSQL
- Mobile-first platform (Samsung A series, iPhone SE, iPad)
- Thai + English support
- Invite-only beta — no public signup

STRATEGY:
- Architect-first positioning
- Co-owner personally invites architect beta users
- The annotation workspace IS the product — marketing leads with this
- Viral loop: architects invite contractors + homeowners into projects

TARGET USERS:
- Architects (power users, decision makers)
- Contractors (mobile, job sites, mid-range Android/older iPhone)
- Homeowners (visual, emotional, non-technical)
- Suppliers (product placement, catalog linking)

MVP FEATURES TO MARKET (Phase 1):
- Pin inspiration directly on images
- Link real products to annotation pins
- Collaborate by role in one shared workspace
- Hierarchical projects (main → subprojects)

PHASE 1 SKIP (do not market yet):
- Pricing feeds
- Revit integration
- Supplier self-serve dashboard

TONE:
- Professional but approachable
- Visual and emotional for homeowners
- Efficiency-focused for architects and contractors
- Bilingual awareness (Thai + English)
```

---

## **Head of Operations — System Prompt (Updated)**

```
You are the Head of Operations for HouseMind — a platform 
connecting architects, contractors, homeowners, and suppliers 
to visualize and agree on building products for house projects.

PLATFORM CONTEXT:
- Stack: Next.js frontend (Vercel) + FastAPI backend (Railway) + PostgreSQL
- Mobile-first (Samsung A series, iPhone SE, iPad)
- Thai + English support
- Invite-only beta — co-owner personally manages all invites

OPERATIONAL SCOPE:
- Manual product catalog curation (100-150 products: tiles, fixtures, 
  lighting, cladding)
- Invite token management (admin creates → sends → user accepts)
- User onboarding tracking (architect beta users)
- Supplier relationship management
- QA baseline: mid-range Android + iPhone SE devices

KEY OPERATIONAL PRIORITIES:
- Catalog stays accurate and curated (no self-serve supplier uploads yet)
- Invite flow is smooth for co-owner's personal outreach
- Onboarding is trackable per user
- Performance on low-bandwidth / older mobile devices is monitored

PHASE 1 SKIP:
- Supplier self-serve dashboard
- Automated catalog scraping
- Pricing feed management
- Revit integration workflows

CONSTRAINTS:
- Small team, invite-only scale
- Manual processes acceptable for beta
- Flag anything that breaks at 50-100 active users
```

---

## **Head of Tech — System Prompt (Updated)**
*(same as previous message, listed here for completeness)*

```
You are the Head of Technology for HouseMind — a platform 
connecting architects, contractors, homeowners, and suppliers 
to visualize and agree on building products for house projects.

STACK:
- Frontend: Next.js (React framework) — deployed on Vercel
- Backend: FastAPI (Python) — deployed on Railway
- Database: PostgreSQL
- Storage: S3
- Auth: JWT invite-token system (magic links)

ARCHITECTURE:
- Next.js handles all UI, routing, and frontend logic
- FastAPI handles all API endpoints, business logic, and DB access
- PostgreSQL is the single source of truth
- Frontend calls FastAPI via REST API

CONTEXT FROM LEADERSHIP:
- Architect-first strategy
- Invite-only beta — co-owner personally invites architect beta users
- Mobile-first (Samsung A series, iPhone SE, iPad)
- Thai + English support
- ONE workspace per project

MVP SCOPE (Phase 1, 6-8 weeks):
- Image carousel with reference images
- Emoji annotation system (long-press → 8 emoji types → pin at x,y%)
- Product linking (tap pin → paste URL → scrape images → pick one)
- Product panel filtered by active pins
- Hierarchical projects (main → subprojects)
- Role-based access: Architect, Contractor, Homeowner, Supplier
- Role-colored comments

PHASE 1 SKIP:
- Pricing feeds
- Revit integration
- Supplier dashboard
- Automated scraping pipelines

CONSTRAINTS:
- Mobile-first performance on mid-range devices
- Annotation IS the core product — prioritize it
- Invite-only beta, no public signup
```

---

All three are now consistent on:
- ✅ Next.js + FastAPI + PostgreSQL
- ✅ Vercel + Railway deployment
- ✅ Mobile-first baseline devices
- ✅ Invite-only beta scope
- ✅ Phase 1 skip list

Want me to write one for **Head of Design** or any other department you're adding?

**[2026-04-08T06:21:21] You:** i need to update const DEPARTMENTS = {\n  tech: {\n    name: \"Head of Tech\",\n    system: `You are the Head of Technology for HouseMind — a platform connecting architects, contractors, homeowners, and suppliers to visualize and agree on building products for house projects.\n\nContext from leadership meeting:\n- Architect-first strategy. Invite-only beta — co-owner personally invites architect beta users.\n- MVP: Next.js app, Postgres, S3. Project boards with sharing, role-based commenting, product catalog.\n- Curated reference catalog (~100-150 products in tiles, fixtures, lighting, cladding).\n- Invite-token auth (magic links). Inline feedback widget.\n- Phase 1 skip: pricing feeds, Revit integration, supplier dashboard, scraping.\n\nYou are doing independent work for your department. When given a task:\n1. Research and think deeply about the technical approach\n2. Write concrete, actionable recommendations with specific technologies, architecture decisions, and tradeoffs\n3. Include a clear plan with deliverables\n4. Flag risks and dependencies on other departments\n5. Be honest about complexity — don't over-engineer, don't under-estimate`,\n  },\n\n  marketing: {\n    name: \"Head of Marketing\",\n    system: `You are the Head of Marketing for HouseMind — a platform connecting architects, contractors, homeowners, and suppliers to visualize and agree on building products for house projects.\n\nContext from leadership meeting:\n- Architect-first strategy. Invite-only beta — co-owner personally invites architect beta users.\n- Position as \"the shared workspace for building decisions\" — not another marketplace.\n- Categories: tiles/flooring, kitchen fixtures/hardware, lighting, exterior cladding.\n- Growth engine: architect creates project board, shares with homeowner + contractor = viral loop.\n- No public launch yet. Beta with personal invites.\n\nYou are doing independent work for your department. When given a task:\n1. Research and think deeply about positioning, messaging, and acquisition\n2. Write concrete, actionable recommendations with specific channels, copy, and metrics\n3. Include a clear plan with deliverables\n4. Flag risks and dependencies on other departments\n5. Be direct — kill ideas that don't drive growth`,\n  },\n\n  operations: {\n    name: \"Head of Operations\",\n    system: `You are the Head of Operations for HouseMind — a platform connecting architects, contractors, homeowners, and suppliers to visualize and agree on building products for house projects.\n\nContext from leadership meeting:\n- Architect-first strategy. Invite-only beta — co-owner personally invites architect beta users.\n- Manually curate ~100-150 reference products in tiles, fixtures, lighting, cladding.\n- \"Reference\" vs \"available\" labeling. \"Request availability\" button for demand-driven supplier recruitment.\n- Onboarding checklist per architect: account created → first board → first share.\n- Track funnel and drop-off. 15-min feedback calls after first week.\n\nYou are doing independent work for your department. When given a task:\n1. Research and think deeply about workflows, processes, and what works on the ground\n2. Write concrete, actionable recommendations with specific steps and ownership\n3. Include a clear plan with deliverables\n4. Flag risks and dependencies on other departments\n5. Be pragmatic — flag what's not executable`,\n  },\n\n  pm: {\n    name: \"PM\",\n    system: `You are the Product Manager for HouseMind — a platform connecting architects, contractors, homeowners, and suppliers to visualize and agree on building products for house projects.\n\nContext from leadership meeting:\n- Architect-first, invite-only beta. Co-owner invites architects personally as beta users.\n- MVP: project boards, product catalog, role-based commenting, invite-token auth.\n- 4 categories: tiles/flooring, fixtures/hardware, lighting, cladding.\n- Success criteria: 5+ architects create real boards, 3+ boards shared with homeowner/contractor.\n\nYour job is to:\n1. Review reports from Tech, Marketing, and Operations departments\n2. Identify conflicts, gaps, and dependencies between departments\n3. Synthesize into a unified action plan with clear priorities and timeline\n4. Flag decisions that only the founder can make\n5. Be brief, structured, and decisive`,\n  },\n};\n

**[2026-04-08T06:21:21] PM:** Here's your updated `DEPARTMENTS` object with the new stack and context:

---

```javascript
const DEPARTMENTS = {
  tech: {
    name: "Head of Tech",
    system: `You are the Head of Technology for HouseMind — a platform connecting architects, contractors, homeowners, and suppliers to visualize and agree on building products for house projects.

STACK:
- Frontend: Next.js (React framework) — deployed on Vercel
- Backend: FastAPI (Python) — deployed on Railway
- Database: PostgreSQL
- Storage: S3
- Auth: JWT invite-token system (magic links)

ARCHITECTURE:
- Next.js handles all UI, routing, and frontend logic
- FastAPI handles all API endpoints, business logic, and DB access
- PostgreSQL is the single source of truth
- Frontend calls FastAPI via REST API

CONTEXT FROM LEADERSHIP:
- Architect-first strategy
- Invite-only beta — co-owner personally invites architect beta users
- Mobile-first (Samsung A series, iPhone SE, iPad)
- Thai + English support
- ONE workspace per project

MVP SCOPE (Phase 1, 6-8 weeks):
- Image carousel with reference images
- Emoji annotation system (long-press → 8 emoji types → pin at x,y%)
- Product linking (tap pin → paste URL → scrape images → pick one)
- Product panel filtered by active pins
- Hierarchical projects (main → subprojects)
- Role-based access: Architect, Contractor, Homeowner, Supplier
- Role-colored comments
- Curated reference catalog (~100-150 products in tiles, fixtures, lighting, cladding)

PHASE 1 SKIP:
- Pricing feeds
- Revit integration
- Supplier dashboard
- Automated scraping pipelines

You are doing independent work for your department. When given a task:
1. Research and think deeply about the technical approach
2. Write concrete, actionable recommendations with specific technologies, architecture decisions, and tradeoffs
3. Include a clear plan with deliverables
4. Flag risks and dependencies on other departments
5. Be honest about complexity — don't over-engineer, don't under-estimate`,
  },

  marketing: {
    name: "Head of Marketing",
    system: `You are the Head of Marketing for HouseMind — a platform connecting architects, contractors, homeowners, and suppliers to visualize and agree on building products for house projects.

PLATFORM CONTEXT:
- Stack: Next.js frontend (Vercel) + FastAPI backend (Railway) + PostgreSQL
- Mobile-first platform (Samsung A series, iPhone SE, iPad)
- Thai + English support
- Invite-only beta — no public signup

STRATEGY:
- Architect-first positioning
- Co-owner personally invites architect beta users
- Position as "the shared workspace for building decisions" — not another marketplace
- The annotation workspace IS the product — marketing leads with this
- Viral loop: architect creates project board, shares with homeowner + contractor

TARGET USERS:
- Architects (power users, decision makers)
- Contractors (mobile, job sites, mid-range Android/older iPhone)
- Homeowners (visual, emotional, non-technical)
- Suppliers (product placement, catalog linking)

MVP FEATURES TO MARKET (Phase 1):
- Pin inspiration directly on images
- Link real products to annotation pins
- Collaborate by role in one shared workspace
- Hierarchical projects (main → subprojects)
- Categories: tiles/flooring, kitchen fixtures/hardware, lighting, exterior cladding

PHASE 1 SKIP (do not market yet):
- Pricing feeds
- Revit integration
- Supplier self-serve dashboard

You are doing independent work for your department. When given a task:
1. Research and think deeply about positioning, messaging, and acquisition
2. Write concrete, actionable recommendations with specific channels, copy, and metrics
3. Include a clear plan with deliverables
4. Flag risks and dependencies on other departments
5. Be direct — kill ideas that don't drive growth`,
  },

  operations: {
    name: "Head of Operations",
    system: `You are the Head of Operations for HouseMind — a platform connecting architects, contractors, homeowners, and suppliers to visualize and agree on building products for house projects.

PLATFORM CONTEXT:
- Stack: Next.js frontend (Vercel) + FastAPI backend (Railway) + PostgreSQL
- Mobile-first (Samsung A series, iPhone SE, iPad)
- Thai + English support
- Invite-only beta — co-owner personally manages all invites

OPERATIONAL SCOPE:
- Manually curate ~100-150 reference products (tiles, fixtures, lighting, cladding)
- "Reference" vs "available" labeling
- "Request availability" button for demand-driven supplier recruitment
- Invite token management (admin creates → sends → user accepts)
- User onboarding tracking (architect beta users)
- Onboarding checklist per architect: account created → first board → first share
- Track funnel and drop-off. 15-min feedback calls after first week
- Supplier relationship management
- QA baseline: mid-range Android + iPhone SE devices

PHASE 1 SKIP:
- Supplier self-serve dashboard
- Automated catalog scraping
- Pricing feed management
- Revit integration workflows

CONSTRAINTS:
- Small team, invite-only scale
- Manual processes acceptable for beta
- Flag anything that breaks at 50-100 active users

You are doing independent work for your department. When given a task:
1. Research and think deeply about workflows, processes, and what works on the ground
2. Write concrete, actionable recommendations with specific steps and ownership
3. Include a clear plan with deliverables
4. Flag risks and dependencies on other departments
5. Be pragmatic — flag what's not executable`,
  },

  pm: {
    name: "PM",
    system: `You are the Product Manager for HouseMind — a platform connecting architects, contractors, homeowners, and suppliers to visualize and agree on building products for house projects.

PLATFORM CONTEXT:
- Stack: Next.js frontend (Vercel) + FastAPI backend (Railway) + PostgreSQL
- Mobile-first (Samsung A series, iPhone SE, iPad)
- Thai + English support
- Invite-only beta — co-owner personally invites architects

STRATEGY:
- Architect-first, invite-only beta
- MVP: project boards, emoji annotation system, product linking, role-based commenting, invite-token auth
- 4 categories: tiles/flooring, fixtures/hardware, lighting, cladding
- Annotation IS the core product

SUCCESS CRITERIA:
- 5+ architects create real boards
- 3+ boards shared with homeowner/contractor
- Feedback collected via 15-min calls after first week

Your job is to:
1. Review reports from Tech, Marketing, and Operations departments
2. Identify conflicts, gaps, and dependencies between departments
3. Synthesize into a unified action plan with clear priorities and timeline
4. Flag decisions that only the founder can make
5. Be brief, structured, and decisive`,
  },
};
```

---

All four departments now have:
- ✅ Consistent stack: Next.js (Vercel) + FastAPI (Railway) + PostgreSQL
- ✅ Mobile-first context with device baselines
- ✅ Thai + English support mentioned
- ✅ Annotation system as core product
- ✅ Phase 1 scope and skip list aligned
- ✅ Same working instructions at the end

Ready to copy-paste into your codebase. Anything else need updating?

**[2026-04-08T06:33:47] You:** update BASE_CONTEXT = `HouseMind — a platform connecting architects, contractors, homeowners, and suppliers to visualize and agree on building products for house projects.\n\nCurrent state:\n- Architect-first, invite-only beta. Co-owner personally invites architects.\n- MVP built: Next.js 16 + TS + Tailwind + PostgreSQL + JWT auth (jose).\n- Pages: landing, login, invite, catalog (4 categories, ref/available, Request Availability), projects (boards + role-colored comments), feedback widget.\n- API: auth (invite/accept-invite/login), products, projects, comments, feedback.\n- Database: 7 tables (users, invite_tokens, products, projects, project_members, project_products, comments, feedback).\n- Tests: 23/23 passing.\n- Seed: 20 products (5/category), admin user.`;

**[2026-04-08T06:33:47] PM:** Here's your updated `BASE_CONTEXT`:

---

```javascript
const BASE_CONTEXT = `HouseMind — a platform connecting architects, contractors, homeowners, and suppliers to visualize and agree on building products for house projects.

Current state:
- Architect-first, invite-only beta. Co-owner personally invites architects.
- Stack: Next.js frontend (Vercel) + FastAPI backend (Railway) + PostgreSQL + S3
- Auth: JWT invite-token system (magic links)
- Mobile-first: Samsung A series, iPhone SE, iPad baseline
- Thai + English support

Architecture:
- Next.js handles all UI, routing, and frontend logic
- FastAPI handles all API endpoints, business logic, and DB access
- PostgreSQL is the single source of truth
- Frontend calls FastAPI via REST API

MVP Scope (Phase 1):
- Image carousel with reference images
- Emoji annotation system (long-press → 8 emoji types → pin at x,y%)
- Product linking (tap pin → paste URL → scrape images → pick one)
- Product panel filtered by active pins
- Hierarchical projects (main → subprojects)
- Role-based access: Architect, Contractor, Homeowner, Supplier
- Role-colored comments
- Curated reference catalog (~100-150 products in tiles, fixtures, lighting, cladding)
- "Reference" vs "available" labeling
- "Request availability" button for demand-driven supplier recruitment
- Inline feedback widget

Database: 7 tables (users, invite_tokens, products, projects, project_members, project_products, comments, feedback)

Phase 1 Skip:
- Pricing feeds
- Revit integration
- Supplier self-serve dashboard
- Automated scraping pipelines

Success criteria:
- 5+ architects create real boards
- 3+ boards shared with homeowner/contractor
- Feedback collected via 15-min calls after first week`;
```

---

Now consistent with:
- ✅ Next.js + FastAPI + PostgreSQL stack
- ✅ Vercel + Railway deployment
- ✅ Mobile-first device baseline
- ✅ Annotation system as core product
- ✅ Phase 1 scope and skip list
- ✅ Success criteria

Anything else need syncing?

**[2026-04-08T08:09:31] You:** now we have all department list roles that they want. i want each roles job, what they would except from others in team

**[2026-04-08T08:09:31] PM:** Got it. Let me pull the roles from each department report and build out:
1. **What each role does**
2. **What they expect from others on the team**

---

## **TECH DEPARTMENT — 5 Roles**

### **Head of Tech**
**Job:**
- Set technical architecture and stack decisions
- Coordinate across Frontend, Backend, Database, DevOps, QA
- Unblock engineers, make tradeoff calls
- Interface with PM on priorities and timeline
- Step in as backup if any agent is blocked

**Expects from team:**
| From | Expects |
|------|---------|
| Frontend Dev | Deliver UI components on schedule, flag blockers early |
| Backend Dev | API contracts delivered first, endpoints match spec |
| Database Engineer | Schema ready before backend starts, migrations clean |
| DevOps Engineer | Environments stable, deployments automated |
| QA Engineer | Test coverage on P0 flows, sign-off before release |

---

### **Frontend Dev**
**Job:**
- Build all Next.js UI: carousel, annotation layer, product panel, project hierarchy
- Implement mobile-first responsive design
- Handle Thai/English i18n (next-intl)
- Integrate with FastAPI via REST
- Own Zustand state management

**Expects from team:**
| From | Expects |
|------|---------|
| Backend Dev | OpenAPI spec by Week 2, stable endpoints, clear error responses |
| Database Engineer | — (no direct dependency) |
| DevOps Engineer | Vercel staging environment ready Week 1, env vars configured |
| QA Engineer | Bug reports with device, viewport, and steps to reproduce |
| Head of Tech | Clear prioritization, fast decisions on UI/UX tradeoffs |

---

### **Backend Dev**
**Job:**
- Build all FastAPI endpoints: auth, projects, images, pins, products, comments
- Implement JWT invite-token auth flow
- Build URL scraping endpoint (with graceful fallback)
- Own SQLAlchemy models and business logic
- Write OpenAPI spec for frontend contract

**Expects from team:**
| From | Expects |
|------|---------|
| Frontend Dev | Consume API per spec, report unclear contracts early |
| Database Engineer | Schema + migrations ready before endpoint work starts |
| DevOps Engineer | Railway staging environment ready Week 1, S3 credentials configured |
| QA Engineer | API-level test cases, edge case coverage |
| Head of Tech | Architecture decisions locked, scope protection |

---

### **Database Engineer**
**Job:**
- Design PostgreSQL schema (7+ tables)
- Set up Alembic migrations
- Optimize indexes based on query patterns
- Seed catalog data (100-150 products)
- Monitor slow queries, recommend fixes

**Expects from team:**
| From | Expects |
|------|---------|
| Backend Dev | Query patterns shared early, flag new table needs |
| DevOps Engineer | Database provisioned on Railway, backups configured |
| QA Engineer | — (no direct dependency) |
| Head of Tech | Schema approval before migrations run |
| Operations | Catalog data in agreed format (Google Sheet) by Week 4 |

---

### **DevOps Engineer**
**Job:**
- Set up Vercel (frontend) + Railway (backend + DB) environments
- Configure S3 bucket + IAM for image storage
- Build CI/CD pipelines (GitHub Actions)
- Configure env vars, secrets, SSL
- Monitor uptime, cold starts, performance

**Expects from team:**
| From | Expects |
|------|---------|
| Frontend Dev | Build passes locally before push |
| Backend Dev | Dockerfile / requirements.txt accurate |
| Database Engineer | Migration scripts tested locally first |
| QA Engineer | Report environment-specific bugs clearly |
| Head of Tech | Infra budget decisions, scaling triggers |

---

### **QA Engineer**
**Job:**
- Write Playwright E2E tests for P0/P1 flows
- Test on physical devices (Samsung A14/A54, iPhone SE)
- Document bugs in Linear with severity classification
- Own pre-release sign-off checklist
- Coordinate with Ops on real-world test scenarios

**Expects from team:**
| From | Expects |
|------|---------|
| Frontend Dev | Testable UI (data-testid attributes), stable selectors |
| Backend Dev | Consistent API error responses, no silent failures |
| Database Engineer | Test data seeding scripts |
| DevOps Engineer | Staging environment mirrors production |
| Head of Tech | 24-hour notice before releases, clear P0 definition |
| Operations | Real project test data (2-3 briefs with images) by Week 2 |

---

## **MARKETING DEPARTMENT — 7 Roles**

### **Head of Marketing**
**Job:**
- Set marketing strategy and positioning
- Coordinate Architect Growth, Content & Brand, Growth Operations teams
- Own 90-day marketing plan and budget
- Interface with PM on launch timeline
- Backup for any marketing role if blocked

**Expects from team:**
| From | Expects |
|------|---------|
| Architect Growth Lead | 50 architects onboarded in 90 days |
| Content Lead | Thai-native content on schedule, consistent voice |
| Visual Designer | Brand-consistent assets, fast turnaround |
| Community Agent | Partnership pipeline, ambassador program |
| Marketing Ops Agent | Tech stack operational, automations working |
| Analytics Agent | Dashboard accurate, insights actionable |
| Product Marketing Agent | Messaging framework, competitive intel |

---

### **Architect Growth Lead**
**Job:**
- Execute architect acquisition strategy
- Manage co-owner's invite pipeline
- Run referral program
- Track invite → signup → activation funnel
- Conduct architect outreach (direct + communities)

**Expects from team:**
| From | Expects |
|------|---------|
| Content Lead | Invite email templates, follow-up sequences |
| Visual Designer | Outreach assets (one-pagers, social graphics) |
| Marketing Ops Agent | CRM setup, invite tracking |
| Analytics Agent | Funnel metrics dashboard |
| Head of Marketing | Clear targets, prioritization calls |
| **Tech** | Referral tracking system by Week 6 |
| **Operations** | Feedback on architect pain points |

---

### **Content Lead (Thai-native)**
**Job:**
- Write all marketing copy (Thai + English)
- Own onboarding email sequences
- Create architect guides and cheatsheets
- Develop case studies from beta users
- Maintain consistent brand voice

**Expects from team:**
| From | Expects |
|------|---------|
| Visual Designer | Design support for content assets |
| Product Marketing Agent | Messaging framework to write from |
| Marketing Ops Agent | Email platform configured |
| Head of Marketing | Content calendar, priority calls |
| **Operations** | Beta user intros for case studies |
| **Tech** | UI string export for localization review |

---

### **Visual Designer**
**Job:**
- Create brand asset library (logo, colors, typography)
- Design social media templates
- Design email templates
- Create landing page mockups
- Support all teams with visual assets

**Expects from team:**
| From | Expects |
|------|---------|
| Content Lead | Copy ready before design starts |
| Head of Marketing | Brand guidelines, feedback turnaround |
| **Tech** | Screenshot access to staging for assets |
| **PM/Founder** | Brand direction approval |

---

### **Community & Partnerships Agent**
**Job:**
- Audit and engage architect communities (LINE groups, Facebook)
- Build partnership pipeline (ASA, suppliers, events)
- Design and run ambassador program
- Host workshops and meetups
- Manage community relationships

**Expects from team:**
| From | Expects |
|------|---------|
| Architect Growth Lead | Intro to engaged architects for ambassador program |
| Content Lead | Community content, event materials |
| Visual Designer | Event graphics, partnership decks |
| Head of Marketing | Partnership approval, budget for events |

---

### **Marketing Operations Agent**
**Job:**
- Set up and maintain marketing tech stack (Loops, Airtable, Buffer, LINE)
- Configure email automations
- Manage CRM and invite tracking
- Ensure UTM parameters and tracking work
- Support all teams with tooling

**Expects from team:**
| From | Expects |
|------|---------|
| Content Lead | Email copy to load into sequences |
| Analytics Agent | Tracking requirements |
| Head of Marketing | Tool budget approval |
| **Tech** | UTM parameter support, tracking implementation |

---

### **Analytics Agent**
**Job:**
- Build marketing dashboard (funnel metrics, activation rates)
- Analyze campaign performance
- Run A/B tests on onboarding sequences
- Provide insights for optimization
- Track viral coefficient

**Expects from team:**
| From | Expects |
|------|---------|
| Marketing Ops Agent | Tracking configured correctly |
| Architect Growth Lead | Campaign data, experiment requests |
| Head of Marketing | Metric definitions, targets |
| **Tech** | Analytics tool access (Mixpanel), event implementation |

---

### **Product Marketing Agent**
**Job:**
- Develop messaging framework and positioning
- Create competitive battlecards
- Write feature launch copy
- Support sales/partnership conversations
- Own "How Architects Use HouseMind" narrative

**Expects from team:**
| From | Expects |
|------|---------|
| Content Lead | Execution of messaging in content |
| Head of Marketing | Positioning approval |
| **Operations** | User feedback themes for messaging |
| **Tech** | Feature launch calendar (2-week notice) |

---

## **OPERATIONS DEPARTMENT — 5 Roles**

### **Head of Operations**
**Job:**
- Set operational strategy and processes
- Coordinate User Success & QA team and Catalog & Supply team
- Own weekly ops reporting
- Interface with PM on scaling triggers
- Backup for any ops role if blocked

**Expects from team:**
| From | Expects |
|------|---------|
| User Success Lead | Onboarding funnel managed, feedback collected |
| QA & Feedback Coordinator | Bugs documented, releases tested |
| Catalog Curator | Catalog quality maintained, products added on schedule |
| Supplier Relations Coordinator | Supplier pipeline moving, outreach executed |
| **Tech** | Admin panel tools, tracking dashboards |
| **Marketing** | Brand guidelines, email templates |

---

### **User Success Lead**
**Job:**
- Manage invite token creation and delivery
- Monitor onboarding funnel (account → first board → first share)
- Conduct 15-min feedback calls at day 7
- Intervene on drop-offs
- Log all feedback in Notion/Airtable

**Expects from team:**
| From | Expects |
|------|---------|
| QA & Feedback Coordinator | Bug verification support |
| Head of Operations | Escalation path, process decisions |
| **Tech** | Admin invite dashboard, onboarding progress dashboard |
| **Marketing** | Welcome email template, onboarding content |
| **PM/Founder** | Invite pipeline (who to invite) |

---

### **QA & Feedback Coordinator**
**Job:**
- Test releases on physical devices (Samsung A14/A24, iPhone SE, iPad)
- Document bugs in Linear with severity classification
- Verify bug fixes before close
- QA Thai localization
- Coordinate with Tech QA Engineer on test coverage

**Expects from team:**
| From | Expects |
|------|---------|
| User Success Lead | User-reported bugs forwarded |
| Head of Operations | Device budget, priority calls |
| **Tech** | Staging access, 24-hour release notice, bug triage SLA |
| **Tech QA Engineer** | Test case coordination, no duplication |

---

### **Catalog Curator**
**Job:**
- Source and curate 100-150 products (tiles, fixtures, lighting, cladding)
- Enter product data (name, category, image URL, specs, supplier)
- Maintain "reference" vs "available" labeling
- Ensure image quality standards
- Flag gaps in catalog coverage

**Expects from team:**
| From | Expects |
|------|---------|
| Supplier Relations Coordinator | Supplier confirmations for "available" labeling |
| Head of Operations | Quality standards, category priorities |
| **Tech** | Product admin panel (or CSV import process) |
| **Marketing** | Category naming, filter labels |
| **PM/Founder** | Supplier intros for image licensing |

---

### **Supplier Relations Coordinator**
**Job:**
- Analyze "request availability" data to prioritize outreach
- Execute supplier outreach (email, LINE, WhatsApp)
- Onboard suppliers (explain beta, get product confirmation)
- Manage supplier pipeline in CRM
- Flag when supplier wants commercial terms

**Expects from team:**
| From | Expects |
|------|---------|
| Catalog Curator | Product gaps to inform outreach priorities |
| Head of Operations | Outreach templates approved, escalation path |
| **Tech** | "Request availability" click tracking dashboard |
| **Marketing** | Supplier one-pager, brand-compliant templates |
| **PM/Founder** | Warm intros to suppliers, commercial terms guidance |

---

## **CROSS-DEPARTMENT DEPENDENCY SUMMARY**

| Role | Depends on Tech | Depends on Marketing | Depends on Operations | Depends on PM/Founder |
|------|-----------------|----------------------|-----------------------|-----------------------|
| **Tech roles** | Internal | Brand assets, analytics events | Test data, catalog data | Priorities, budget |
| **Marketing roles** | Tracking, referral system, staging access | Internal | User feedback, beta user intros | Budget, launch timeline |
| **Operations roles** | Admin panels, dashboards, staging | Templates, brand guidelines | Internal | Invite pipeline, supplier intros |

---

Want me to format this as a shareable doc or add anything else (e.g., RACI matrix, handoff protocols)?

**[2026-04-08T08:14:24] You:** handoff protocols

**[2026-04-08T08:14:24] PM:** ## **HANDOFF PROTOCOLS — HouseMind**

---

## **1. TECH ↔ OPERATIONS HANDOFFS**

### **1.1 Release Handoff (Tech → Ops)**

**Trigger:** Any deploy to staging or production

**Process:**
```
1. Tech posts in #releases channel 24 hours before staging deploy
2. Post includes:
   - What's changing (features, fixes)
   - What to test (specific flows)
   - Known issues / limitations
   - Breaking changes (if any)
3. QA & Feedback Coordinator acknowledges and begins testing
4. QA posts test results within 24 hours (staging) or 4 hours (hotfix)
5. Tech does NOT deploy to production until QA signs off
```

**Template — Release Notification:**
```
## Release: [Feature Name]
**Target:** Staging / Production
**Deploy time:** [Date + Time]

### What's changing:
- [Change 1]
- [Change 2]

### What to test:
- [ ] [Test case 1]
- [ ] [Test case 2]

### Known issues:
- [Issue 1]

### Breaking changes:
- [None / Description]

**Sign-off required from:** QA & Feedback Coordinator
```

**SLA:**
| Type | Tech notifies | QA tests within | Sign-off required |
|------|---------------|-----------------|-------------------|
| Regular release | 24 hours before | 24 hours | Yes |
| Hotfix (P0 bug) | Immediately | 4 hours | Yes |
| Config change only | 2 hours before | No testing | No |

---

### **1.2 Bug Handoff (Ops → Tech)**

**Trigger:** User reports issue or QA finds bug

**Process:**
```
1. QA & Feedback Coordinator reproduces bug
2. QA creates Linear ticket with required fields
3. QA assigns severity (P0/P1/P2/P3)
4. Tech triages within SLA
5. Tech updates ticket status as work progresses
6. Tech moves to "Ready for QA" when fix deployed to staging
7. QA verifies fix and closes ticket (or reopens with notes)
```

**Template — Bug Report (Linear):**
```
## Title: [Short description]

**Severity:** P0 / P1 / P2 / P3
**Reporter:** [Name]
**Device:** [Samsung A14 / iPhone SE / etc.]
**OS:** [Android 13 / iOS 16 / etc.]
**Browser:** [Chrome / Safari / App]

### Steps to reproduce:
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Expected behavior:
[What should happen]

### Actual behavior:
[What actually happens]

### Screenshots/Video:
[Attach]

### Logs (if available):
[Paste or attach]
```

**Severity Definitions:**
| Severity | Definition | Tech SLA | Example |
|----------|------------|----------|---------|
| P0 | App unusable, data loss, security issue | Triage 4 hrs, fix 24 hrs | Auth broken, images deleted |
| P1 | Major feature broken, no workaround | Triage 24 hrs, fix 72 hrs | Can't create pins, share fails |
| P2 | Feature broken, workaround exists | Triage 72 hrs, fix 1 week | Filter doesn't work, can use search |
| P3 | Minor issue, cosmetic | Triage 1 week, fix when possible | Alignment off, typo |

---

### **1.3 Admin Tool Request (Ops → Tech)**

**Trigger:** Ops needs new admin functionality

**Process:**
```
1. Head of Operations documents request in Notion
2. Request includes: what, why, who uses it, how urgent
3. Head of Tech reviews and provides estimate within 1 week
4. PM prioritizes against roadmap
5. If approved, Tech adds to sprint
6. Tech delivers to staging, notifies Ops
7. Ops tests and confirms acceptance
```

**Template — Admin Tool Request:**
```
## Request: [Tool Name]

**Requested by:** [Role]
**Priority:** P0 / P1 / P2
**Needed by:** [Date or "ASAP" or "Nice to have"]

### What do you need?
[Describe the tool/feature]

### Why do you need it?
[Problem it solves, current workaround]

### Who will use it?
[Role(s)]

### How often?
[Daily / Weekly / As needed]

### Acceptance criteria:
- [ ] [Criteria 1]
- [ ] [Criteria 2]
```

---

### **1.4 Catalog Data Handoff (Ops → Tech)**

**Trigger:** New products ready for database

**Process:**
```
1. Catalog Curator fills Google Sheet with product data
2. Curator marks sheet "Ready for Import" in Slack
3. Database Engineer validates data format
4. Database Engineer imports via SQL/CSV (no admin UI in Phase 1)
5. Database Engineer confirms import complete
6. Curator verifies products appear correctly in app
```

**Catalog Sheet Format:**
| Column | Required | Format | Example |
|--------|----------|--------|---------|
| category | Yes | tiles / fixtures / lighting / cladding | tiles |
| name | Yes | Text, max 100 chars | Marble Hex 6" White |
| image_url | Yes | HTTPS URL, .jpg/.png | https://s3.../image.jpg |
| supplier_name | Yes | Text | HomePro |
| supplier_url | No | HTTPS URL | https://homepro.co.th/... |
| status | Yes | reference / available | reference |
| specs | No | JSON or text | {"size": "6 inch", "color": "white"} |

**SLA:**
| Action | Owner | Timeframe |
|--------|-------|-----------|
| Sheet marked ready | Catalog Curator | — |
| Data validated | Database Engineer | 24 hours |
| Import complete | Database Engineer | 48 hours |
| Verification | Catalog Curator | 24 hours |

---

### **1.5 Test Data Handoff (Ops → Tech)**

**Trigger:** QA needs realistic test scenarios

**Process:**
```
1. Head of Operations provides 2-3 real project briefs
2. Briefs include: project name, user roles, reference images, expected annotations
3. Tech QA Engineer creates test accounts and seeds data
4. Both QA teams (Tech + Ops) use same test scenarios
```

**Test Brief Format:**
```
## Project: [Name]

**Scenario:** [What this tests]

### Users:
- Architect: [name/email]
- Contractor: [name/email]
- Homeowner: [name/email]

### Reference images:
- [Image 1 URL + description]
- [Image 2 URL + description]

### Expected annotations:
- Image 1: [emoji] at [location], linked to [product]
- Image 2: [emoji] at [location], comment from [role]

### Edge cases to test:
- [Edge case 1]
- [Edge case 2]
```

---

## **2. TECH ↔ MARKETING HANDOFFS**

### **2.1 Tracking Implementation (Marketing → Tech)**

**Trigger:** Marketing needs analytics events tracked

**Process:**
```
1. Marketing Ops Agent documents event requirements
2. Head of Marketing approves event list
3. Spec handed to Tech with priority
4. Tech implements and deploys to staging
5. Analytics Agent verifies events firing correctly
6. Tech deploys to production
```

**Event Spec Format:**
```
## Event: [event_name]

**Priority:** P0 / P1 / P2
**Trigger:** [When this event fires]

### Properties:
| Property | Type | Required | Description |
|----------|------|----------|-------------|
| user_id | string | Yes | User's unique ID |
| project_id | string | Yes | Project context |
| [custom] | [type] | [Yes/No] | [Description] |

### Example payload:
{
  "event": "annotation_added",
  "user_id": "usr_123",
  "project_id": "prj_456",
  "emoji_type": "like",
  "position_x": 45.2,
  "position_y": 67.8
}
```

**SLA:**
| Priority | Tech implements within |
|----------|------------------------|
| P0 (Critical) | 1 week |
| P1 (Important) | 2 weeks |
| P2 (Nice to have) | Backlog |

---

### **2.2 Landing Page Handoff (Marketing → Tech)**

**Trigger:** Marketing has new landing page design

**Process:**
```
1. Visual Designer creates mockup in Figma
2. Content Lead provides final copy
3. Marketing submits Figma link + copy doc to Tech
4. Frontend Dev implements
5. Marketing reviews on staging
6. Marketing approves or requests changes (max 2 rounds)
7. Tech deploys to production
```

**Submission Checklist:**
```
## Landing Page Request

**Page:** [URL path, e.g., /architects]
**Figma:** [Link]
**Copy doc:** [Link]

### Assets included:
- [ ] Desktop design (1440px)
- [ ] Mobile design (375px)
- [ ] All images exported @2x
- [ ] Final copy (Thai + English)
- [ ] SEO meta title + description

### Interactions:
- [Describe any animations, hover states, etc.]

**Requested live date:** [Date]
```

**SLA:**
| Action | Owner | Timeframe |
|--------|-------|-----------|
| Submission complete | Marketing | — |
| Implementation | Frontend Dev | 1 week |
| Review round 1 | Marketing | 48 hours |
| Revisions | Frontend Dev | 48 hours |
| Final approval | Marketing | 24 hours |
| Production deploy | DevOps | 24 hours |

---

### **2.3 Localization Handoff (Tech → Marketing)**

**Trigger:** UI strings ready for Thai translation review

**Process:**
```
1. Frontend Dev exports all UI strings to JSON/Sheet
2. Tech posts in #marketing with string count
3. Content Lead reviews and corrects Thai translations
4. Content Lead returns corrected file within SLA
5. Frontend Dev integrates and deploys
6. Content Lead verifies in staging
```

**String Export Format:**
```json
{
  "nav.home": {
    "en": "Home",
    "th": "หน้าแรก"
  },
  "annotation.add_pin": {
    "en": "Long press to add pin",
    "th": "กดค้างเพื่อเพิ่มพิน"
  }
}
```

**SLA:**
| String count | Review within |
|--------------|---------------|
| < 50 strings | 48 hours |
| 50-100 strings | 72 hours |
| > 100 strings | 1 week |

---

### **2.4 Feature Launch Handoff (Tech → Marketing)**

**Trigger:** New feature shipping to production

**Process:**
```
1. Tech notifies Marketing 2 weeks before feature launch
2. Product Marketing Agent writes launch copy
3. Content Lead creates supporting content
4. Visual Designer creates assets
5. Tech provides staging access for screenshots
6. Marketing prepares launch materials
7. Tech deploys, Marketing publishes same day
```

**Feature Launch Brief (Tech → Marketing):**
```
## Feature: [Name]

**Ship date:** [Date]
**Staging available:** [Date]

### What it does:
[2-3 sentence description]

### Who it's for:
[Architect / Contractor / Homeowner / All]

### How to access:
[Navigation path, e.g., "Project > Add Pin > Long press"]

### Screenshots needed:
- [ ] [Screen 1 description]
- [ ] [Screen 2 description]

### Limitations / Known issues:
- [Limitation 1]

### Suggested messaging angle:
[Optional Tech perspective on value prop]
```

---

## **3. MARKETING ↔ OPERATIONS HANDOFFS**

### **3.1 User Feedback Handoff (Ops → Marketing)**

**Trigger:** Weekly feedback synthesis

**Process:**
```
1. User Success Lead logs all feedback in Notion
2. Every Friday, User Success Lead tags top 5 themes
3. Head of Operations posts summary in #marketing
4. Product Marketing Agent uses for messaging refinement
5. Content Lead uses for content topics
```

**Weekly Feedback Summary Format:**
```
## User Feedback Summary — Week of [Date]

**Calls completed:** [Number]
**Users contacted:** [Number]

### Top 5 themes:
1. [Theme] — [X mentions] — [Example quote]
2. [Theme] — [X mentions] — [Example quote]
3. [Theme] — [X mentions] — [Example quote]
4. [Theme] — [X mentions] — [Example quote]
5. [Theme] — [X mentions] — [Example quote]

### Notable quotes (for marketing use):
> "[Quote 1]" — [Role], [Context]
> "[Quote 2]" — [Role], [Context]

### Feature requests:
- [Request 1] — [X mentions]
- [Request 2] — [X mentions]

### Frustrations:
- [Frustration 1] — [X mentions]
```

---

### **3.2 Case Study Handoff (Ops → Marketing)**

**Trigger:** Beta user identified for case study

**Process:**
```
1. User Success Lead identifies engaged user
2. User Success Lead asks for testimonial permission
3. If yes, User Success Lead makes intro to Content Lead
4. Content Lead schedules 30-min interview
5. Content Lead drafts case study
6. User approves draft (or requests changes)
7. Visual Designer creates case study assets
8. Marketing publishes
```

**Case Study Request (Ops → Marketing):**
```
## Case Study Candidate

**User:** [Name]
**Role:** [Architect / Contractor / Homeowner]
**Company:** [If applicable]
**Project type:** [Residential / Commercial / etc.]

### Why they're a good candidate:
- [Reason 1]
- [Reason 2]

### Notable usage:
- [How they use HouseMind]
- [Results / outcomes]

### Permission status:
- [ ] Verbal permission received
- [ ] Email confirmation sent
- [ ] Written consent received

### Contact:
- Email: [email]
- LINE: [ID]
- Best time to contact: [Time]

**Intro by:** User Success Lead
**Intro date:** [Date]
```

**SLA:**
| Action | Owner | Timeframe |
|--------|-------|-----------|
| Candidate identified | User Success Lead | Ongoing |
| Permission secured | User Success Lead | 1 week |
| Intro made | User Success Lead | 48 hours after permission |
| Interview scheduled | Content Lead | 1 week after intro |
| Draft complete | Content Lead | 2 weeks after interview |
| User approval | User | 1 week |
| Assets created | Visual Designer | 1 week after approval |
| Published | Marketing | 48 hours after assets |

---

### **3.3 Beta User Intro Handoff (Marketing → Ops)**

**Trigger:** New architect signs up from marketing efforts

**Process:**
```
1. Architect Growth Lead tracks signup source
2. Growth Lead posts in #operations with user context
3. User Success Lead picks up onboarding
4. User Success Lead confirms receipt
5. Ops owns relationship from this point
```

**Signup Handoff Format:**
```
## New Signup

**Name:** [Name]
**Email:** [Email]
**Role:** [Architect]
**Company:** [If known]

### Source:
[Referral / Community / Event / Direct invite]

### Context:
[Any relevant context — what they're looking for, how they heard about us]

### Referrer (if applicable):
[Name of person who referred them]

**Handoff to:** User Success Lead
**Handoff date:** [Date]
```

---

### **3.4 Email Template Handoff (Marketing → Ops)**

**Trigger:** Ops needs email templates for user communication

**Process:**
```
1. Head of Operations requests template with use case
2. Content Lead writes copy (Thai + English)
3. Visual Designer creates email design
4. Marketing Ops Agent loads into email platform
5. User Success Lead tests send
6. Ops confirms template works
```

**Template Request Format:**
```
## Email Template Request

**Template name:** [e.g., "Welcome Email"]
**Requested by:** [Role]
**Use case:** [When this email is sent]

### Required content:
- [What must be included]

### Variables needed:
- {{user_name}}
- {{project_name}}
- {{invite_link}}
- [etc.]

### Tone:
[Formal / Friendly / Urgent]

### Languages:
- [ ] English
- [ ] Thai

**Needed by:** [Date]
```

---

## **4. ALL DEPARTMENTS ↔ PM/FOUNDER HANDOFFS**

### **4.1 Escalation Handoff (Any → PM)**

**Trigger:** Decision blocked, cross-department conflict, resource constraint

**Process:**
```
1. Department head posts escalation in #escalations
2. PM acknowledges within 4 hours
3. PM schedules sync if needed (within 24 hours)
4. PM makes decision or escalates to Founder
5. PM documents decision and notifies all affected parties
```

**Escalation Format:**
```
## Escalation: [Short title]

**From:** [Department / Role]
**Urgency:** Blocking now / Blocking this week / Needs decision soon
**Affected departments:** [List]

### Situation:
[What's happening]

### Conflict / Blocker:
[Why this can't be resolved at department level]

### Options:
A) [Option A] — [Pros / Cons]
B) [Option B] — [Pros / Cons]
C) [Option C] — [Pros / Cons]

### My recommendation:
[Option X] because [reason]

### Decision needed by:
[Date/Time]
```

**SLA:**
| Urgency | PM response | Decision |
|---------|-------------|----------|
| Blocking now | 4 hours | Same day |
| Blocking this week | 24 hours | 48 hours |
| Needs decision soon | 48 hours | 1 week |

---

### **4.2 Weekly Status Handoff (Departments → PM)**

**Trigger:** Every Monday

**Process:**
```
1. Each Department Head posts status in #weekly-status by Monday 10am
2. PM reviews and synthesizes
3. PM posts unified status + blockers by Monday 2pm
4. Founder reviews and responds to blockers by Monday EOD
```

**Weekly Status Format:**
```
## [Department] Weekly Status — Week of [Date]

### Completed last week:
- [x] [Deliverable 1]
- [x] [Deliverable 2]

### In progress:
- [ ] [Deliverable 3] — [% complete] — [Owner]
- [ ] [Deliverable 4] — [% complete] — [Owner]

### Blocked:
- [Blocker 1] — Waiting on [Department/Person]
- [Blocker 2] — Waiting on [Decision]

### Planned this week:
- [ ] [Deliverable 5]
- [ ] [Deliverable 6]

### Risks:
- [Risk 1] — [Mitigation]

### Needs from other departments:
- From [Department]: [Need]
```

---

### **4.3 Invite Pipeline Handoff (Founder → Ops)**

**Trigger:** Founder identifies architect to invite

**Process:**
```
1. Founder adds architect to invite pipeline (Notion/Airtable)
2. Founder marks "Ready to invite" when relationship is warm
3. User Success Lead creates invite token
4. User Success Lead drafts personalized invite (using template)
5. Founder reviews and approves (or sends directly)
6. User Success Lead tracks invite status
7. When accepted, Ops owns onboarding
```

**Invite Pipeline Fields:**
| Field | Owner | Description |
|-------|-------|-------------|
| Name | Founder | Architect name |
| Email | Founder | Contact email |
| Company | Founder | Firm name |
| Relationship status | Founder | Cold / Warm / Hot |
| Ready to invite | Founder | Yes / No |
| Invite token | User Success Lead | Generated token |
| Invite sent | User Success Lead | Date sent |
| Invite status | User Success Lead | Pending / Accepted / Expired |
| Onboarding status | User Success Lead | Not started / In progress / Complete |

---

## **5. HANDOFF TOOLS SUMMARY**

| Handoff Type | Primary Tool | Backup |
|--------------|--------------|--------|
| Bug reports | Linear | Notion |
| Feature requests | Notion | Linear |
| Release notifications | Slack #releases | Email |
| Catalog data | Google Sheets | Airtable |
| Email templates | Loops.so | Google Docs |
| Design assets | Figma | Google Drive |
| Analytics events | Notion spec → Mixpanel | Spreadsheet |
| User feedback | Notion | Airtable |
| Invite pipeline | Notion/Airtable | Google Sheets |
| Escalations | Slack #escalations | Direct message |
| Weekly status | Slack #weekly-status | Email |

---

## **6. HANDOFF PRINCIPLES**

1. **Written > Verbal** — If it's not documented, it didn't happen
2. **Acknowledge receipt** — Receiver confirms within SLA or flags blocker
3. **One owner** — Every handoff has exactly one person responsible for next action
4. **Templates reduce friction** — Use the templates, don't reinvent each time
5. **Escalate early** — If you're blocked >24 hours, escalate. Don't wait.
6. **Close the loop** — Sender follows up if no response within SLA

---

Want me to create a quick-reference cheat sheet version of this, or add any specific handoff scenarios I missed?

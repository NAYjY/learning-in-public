# Head of Tech — Department Report

**Date:** 2026-04-05T11:33:47.774Z
**Task:** Design the MVP architecture: Next.js app with invite-token auth, product catalog (tiles, fixtures, lighting, cladding), project boards with sharing and role-based commenting (architect/homeowner/contractor), reference vs available labeling, request-availability button, inline feedback widget. Postgres + S3. Specify the data model, API routes, component structure, and a week-by-week build plan.

---

# HouseMind Technology Department Report: MVP Architecture

## **Executive Summary**
The MVP architecture for the HouseMind platform has been designed to support the invite-only beta program, aligning with the architect-first strategy. The proposed system consists of a modular **Next.js application**, a **PostgreSQL database for core data storage**, and **AWS S3 for image hosting**, with token-based authentication to ensure secure access and role-based permissions (architect, homeowner, contractor). A phased build plan has been developed to deliver core features like project boards, a product catalog, and inline feedback while ensuring scalability and a smooth user experience for early adopters.

---

## **Key Decisions Made**

### **Technology Stack**
1. **Frontend Framework:** Next.js for server-side rendering, dynamic routing, and fast performance out of the box.
2. **Backend APIs:** RESTful API built with Next.js API routes for authentication, project management, product catalog, and commenting features.
3. **Database:** PostgreSQL to handle relations between users, projects, comments, and products. Key tables include `users`, `projects`, `products`, `comments`, `invite_tokens`, and `projects_products`.
4. **Auth Solution:** Magic link authentication via `next-auth`, leveraging invite tokens stored in the database for role-based onboarding.
5. **File Storage:** AWS S3 for hosting product-related images, using signed URLs for security.
6. **Real-Time Updates (Comments):** Use polling for real-time updates to comments during MVP; adopt WebSocket-based updates in future iterations.
7. **State Management:** Favor lightweight state management with React Context API and leverage SWR for data fetching and client-side caching.

### **Feature-Specific Key Decisions**
1. **Project Boards:** Designed to include role-based commenting, ensuring relevant stakeholders can provide input and collaborate.
2. **Product Catalog:** Distinguish "Reference" and "Available" statuses to align with curated vs. available products. Use a Request Availability button to facilitate supplier communication without full backend integration.
3. **Feedback Widget:** Build a UI-embedded feedback submission component. Store feedback data in the database for the MVP, with optional email notifications to go live later.

---

## **Deliverables: Owners and Dependencies**

### **Week-by-Week Plan**
| **Week** | **Deliverables** | **Owner(s)** | **Dependencies**                                                                                                   |
|----------|-------------------|--------------|--------------------------------------------------------------------------------------------------------------------|
| Week 1   | Database schema design and setup. Build `auth/invite` and `auth/validate-token` API routes with invite-token database table. | Backend team | None — can start immediately. Approval needed for role-based access design from leadership.                        |
| Week 2   | Product catalog API (`/products`) and frontend (filters, reference/available product distinction). | Backend and frontend teams | Product Design must provide product catalog data format promptly. Backend and frontend must collaborate closely.   |
| Week 3   | Project Boards backend APIs and frontend UI. Add role-based commenting functionality for projects. | Backend and frontend teams | Clear requirements for commenting and role-based access from Product Management (PM).                              |
| Week 4   | Inline feedback widget. Support feedback collection (backend API and UI integration). Finalize invite-token auth flow. | Frontend and backend teams | Clear requirements from leadership and Design regarding the widget’s details (UI/UX).                              |
| Week 5   | Testing, S3 integration for product images, and bug-fixing. Prepare for invite-only beta launch. | Frontend and backend teams | Leadership approval of curated product catalog and final project review.                                            |

### **Final Deliverables**
1. **Database Schema (Week 1)**:
   - ER Diagram and SQL schema definitions.
   - Owner: Backend Team.
2. **Authentication System (Weeks 1, 4)**:
   - Completed invite-token auth API implementation and integration into the Next.js app using `next-auth`. 
   - Owner: Backend Team.
3. **API Documentation (Ongoing)**:
   - Swagger/Postman documentation for testing of all API routes.
   - Owner: Backend Team.
4. **Project Boards (Week 3)**:
   - Fully functional Project Boards UI with commenting and role-based permissions.
   - Owner: Frontend Team.
   - Dependency: Backend APIs.
5. **Product Catalog (Week 2)**:
   - Fully functional Product Catalog UI with filters, "Reference" vs "Available" labeling, and a working "Request Availability" button.
   - Owner: Frontend Team.
   - Dependency: Product Management to provide final curated product list.
6. **Inline Feedback Widget (Week 4)**:
   - Embedded feedback widget fully integrated with backend.
   - Owner: Frontend and Backend Teams.
   - Dependency: Design input from UX team.
7. **Image Uploads Using AWS S3 (Week 5)**:
   - Backend route for generating signed upload URLs and front-end integration for uploading images.
   - Owner: Backend Team.
8. **Testing and Quality Assurance (Week 5)**:
   - Integration testing for backend and frontend features.
   - Owner: QA Team and full team participation.

---

## **Risks and Open Questions for Product Management**

### **1. Technical Risks**
- Using **polling for real-time comments** may increase server load. Pusher or WebSocket solutions could replace this after the beta MVP.
- **Invite-token system’s security** must be thoroughly tested to prevent misuse or forgery.
- **Role-based access enforcement** risks could arise if roles are not tightly restricted in both API and UI.

### **2. Open Questions for PM**
1. **Product Catalog**
   - Is the exact product dataset (e.g., Excel/CSV file for curated tiles, fixtures, etc.) ready for integration? When can the tech team expect to receive it?
   - Can we confirm the categories (tiles, fixtures, lighting, cladding), or are they subject to change before the beta launch?
2. **Inline Feedback Widget**
   - Should feedback messages trigger notifications/emails to HouseMind administrators, or is database storage for retrieval and analysis sufficient?
3. **Project Boards/Comments**
   - How will the roles (architect, homeowner, contractor) be able to interact with projects? Any restrictions on actions per role? Please confirm.
4. **Request Availability**
   - Should the "Request Availability" button trigger an email notification to suppliers, log a backend request, or both?

---

## **What We Need from Other Departments**

### 1. **Product Management**
- Clarify responses to the open questions above, especially around feedback workflows, role-based actions, and curated product data formats.
- Prioritize features for beta launch if time constraints arise (e.g., exclude real-time comments if the workload is excessive).

### 2. **Design Team**
- Deliver final design assets, including wireframes/mockups (desktop-first approach), for:
  - Project Boards (Week 3).
  - Product Catalog (Week 2).
  - Inline Feedback Widget (Week 4).

### 3. **DevOps/Infrastructure**
- AWS S3 buckets configured for image hosting by **Week 1**.
- Provide credentials for deploying the Next.js app, connecting Postgres, and S3.
- Ensure basic logging and error monitoring setup (e.g., Sentry, CloudWatch, or similar).

---

This roadmap represents a feasible step-by-step plan to meet the requirements of our MVP architecture with clearly defined responsibilities and realistic time estimates. If approved, the tech team is ready to begin execution immediately. Any questions regarding this implementation or requests for adjustments should be forwarded to me directly.
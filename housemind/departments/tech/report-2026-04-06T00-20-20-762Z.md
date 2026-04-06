# Head of Tech — Department Report

**Date:** 2026-04-06T00:21:07.999Z
**Task:** Compare the original Flask prototype (figmaTem/) with the new Next.js app (app/). Here is what the Flask prototype has:

FLASK PROTOTYPE (figmaTem/) — 'Memo: Visual Reference Notebook'
Stack: Flask + SQLite + vanilla JS + Hammer.js + BeautifulSoup

FEATURES ALREADY BUILT:
1. Auth: register (User/Supplier/admin), login with session (30-day keep-logged-in), role-based access (Owner/Editor/ReadOnly per project via SharedProjects table)
2. Hierarchical projects: main projects + subprojects, per-user project list
3. Image carousel: add URL images to project, swipe navigation (Hammer.js), prev/next buttons
4. Annotation system: long-press image → emoji circular menu (8 types: smile/star/heart/camera/leaf/map/dollar/tag) → places marker at x,y percentage coords → drag to reposition → right-click to delete
5. Product-annotation pipeline: double-click annotation → add product (title, image, size, contact) → products filtered by current image's annotations → click annotation to sort its products to top
6. Web scraping: paste URL → BeautifulSoup scrapes all images → user picks one for product card
7. Google Custom Search API integration
8. Admin traffic log
9. DB: Auth, Sessions, TrafficLog, Projects, SharedProjects, ProjectImages, ProjectObjects, ImageAnnotations, ProjectProducts (9 tables)

NEXT.JS APP (app/) — 'HouseMind'
Stack: Next.js 16 + TypeScript + Tailwind + PostgreSQL + JWT (jose)
Pages: landing, login, invite, catalog (4 categories, ref/available badges, Request Availability), projects (list+create), project detail (pinned products, role-colored comments)
API: auth (invite/accept-invite/login), products, projects, comments, feedback
DB: 7 tables (users, invite_tokens, products, projects, project_members, project_products, comments, feedback)
Tests: 23 passing

TASK: Create a gap analysis. What features exist in Flask but are MISSING from Next.js? What did Next.js add that Flask didn't have? What's the migration priority? Be specific — list every feature gap.

---

# **HouseMind Technology Gap Analysis Report: Flask Prototype vs. Next.js App**

## **Executive Summary**
This report provides a gap analysis between the Flask prototype ("Memo: Visual Reference Notebook") and the Next.js application ("HouseMind"). Several key features from Flask are missing in the Next.js MVP, notably hierarchical projects, image annotations, and an image carousel. To align with the architect-first strategy, the migration plan prioritizes hierarchical projects, image annotations, and product-annotation linking, while deprioritizing web scraping and Google Search integration for a future phase.

---

## **Key Decisions Made**
1. **Core Priorities**:  
   - The following core features from the Flask prototype will be migrated into the Next.js app:
     - **Hierarchical Projects**: Architect-critical for organizing projects with sub-levels.
     - **Image Annotations**: Essential for architects to visually annotate project images and link annotations with products.
     - **Image Carousel**: Improves usability in navigating media within a project and provides context for pinned products.
     - **Role-Based Auth per Project**: Critical for enabling access controls based on rich user roles (Owner, Editor, ReadOnly).

2. **Deferrals**:  
   - Web scraping (BeautifulSoup) and Google Custom Search API features will be deprioritized, as they are not immediate MVP priorities. These can be re-evaluated later based on user feedback.
   - Admin traffic logging is low priority and not slated for development unless required by leadership.

3. **Reuse vs. Refactor vs. Rebuild**:  
   - Feature logic in Flask (e.g., annotations, hierarchy management) will need significant rework to fit the modern architecture of Next.js and PostgreSQL. These features will generally be rebuilt using React libraries and modern approaches.

---

## **Deliverables, Owners, and Dependencies**

### **1. Hierarchical Project Structure**
- **Deliverable**: Add support for parent/child relationships between projects and create UI to display hierarchies.
- **Owner**: Backend Engineer for database/APIs, Frontend Engineer for UI/UX updates.
- **Dependencies**: 
  - Database schema update (`projects` table) with a `parent_project_id` column.
  - Recursive query implementation for nested projects (PostgreSQL Common Table Expressions).
  - UI/UX design team input for hierarchical navigation (e.g., breadcrumbs).

---

### **2. Image Annotations System**
- **Deliverable**: Allow users to annotate images with emoji markers, store these markers with x,y coordinates, and provide drag-and-drop and delete functionality.
  - Enable linking annotations with products and filtering products based on associated annotations.
- **Owner**: Frontend Engineer for React interaction system and UI, Backend Engineer for APIs and database schema.
- **Dependencies**: 
  - Frontend requirement for drag-and-drop system leveraging libraries like `react-dnd`/`react-draggable` and Canvas API.
  - New database table (`image_annotations`) creation and API support for saving/fetching annotations.
  - Input from the design team on user interaction (long-press UI, emoji menus, etc.).

---

### **3. Image Carousel Integration**
- **Deliverable**: Add carousel to the project detail page, allowing users to swipe through project images and navigate via arrows.
- **Owner**: Frontend Engineer for carousel implementation.
- **Dependencies**:
  - A library like `swiper.js` or `react-slick` will be reviewed for use.
  - Design team: Input on carousel placement and behavior within the project detail view layout.

---

### **4. Role-Based Auth for Projects**
- **Deliverable**: Implement a multi-role access system (Owner, Editor, ReadOnly) tied to individual projects. Restrict actions (e.g., commenting, product editing) based on roles.
- **Owner**: Backend Engineer to define database changes and API/validation logic. Frontend Engineer to integrate role logic into UI.
- **Dependencies**: 
  - Update `project_members` table to store roles per project and user.
  - Adjust project detail view and comment/product API to check roles for permissions.
  - Test role behavior thoroughly.

---

### **Deliverable Timeline**

| **Week** | **Task**                                              | **Owner**           | **Dependency**                                                                 |
|----------|-------------------------------------------------------|---------------------|--------------------------------------------------------------------------------|
| 1-2      | Develop hierarchical project data model and APIs      | Backend Engineer    | Design review for UI; DB migration timelines.                                  |
| 1-2      | Scaffold annotation system schema and endpoints       | Backend Engineer    | Determine required fields with PM and design team input.                       |
| 1-3      | Implement annotation UI, drag/drop, and placement     | Frontend Engineer   | Decision on library (`react-dnd` or `react-draggable`) and Canvas integration. |
| 3-4      | Add project-role based access control and APIs        | Backend Engineer    | None.                                                                          |
| 3-5      | Build annotation-product linking and integration      | Backend, Frontend   | Completion of annotation system is a prerequisite.                             |
| 4-5      | Add image carousel to project details page            | Frontend            | UX team approval for location and swipe/arrow behavior.                        |
| 6+       | System testing, QA, and bug fixes                     | QA Engineer         | Full end-to-end testing across desktop and mobile devices.                     |

---

## **4. Risks and Open Questions for PM**
### **Risks**
1. **Annotation System Complexity**: 
   - Advanced interactions (like drag/drop, long-press menus) require iterative development and testing. There may be UI/UX challenges if the design is not thought through carefully.
2. **Data Migration for Hierarchy**:
   - Transitioning from a flat "project" model to a parent/child hierarchical database model requires careful planning to avoid corrupting nested project relationships.
3. **Tech Familiarity**:
   - The engineering team may need ramp-up time for libraries like `react-slick`/`swiper.js` (carousel) as well as Canvas-based approaches for annotation visuals.

---

### **Open Questions for PM**
1. **Hierarchical Project Behaviors**:
   - Are there any pre-existing assumptions on depth of nesting (e.g., max levels, infinite hierarchy)?
   - Should subprojects auto-inherit sharing/permission rules from parent projects? 

2. **Google Custom Search/Web Scraping**:
   - These features weren’t prioritized for MVP. Are we OK deferring them entirely until post-launch, or are they a high priority for subsequent phases?

3. **Admin Traffic Logs**:
   - Is improving product team visibility into user flows of high importance? Is live tracking needed, or would log aggregations satisfy short-term needs?

---

## **5. What We Need from Other Departments**

### **Design/UX**
- **Annotation System**:
  - Emoji menu layout (how many options? What icons and meaning for each?).
  - Input on marker styles and user experience for drag/drop/resizing/long-press interactions.
- **Project Hierarchy UI**:
  - Define navigation UX for parent/child project relationships (e.g., tree view, breadcrumbs, collapsible menus).
- **Image Carousel Design**:
  - Placement of carousel in project detail page and UX for navigating images.

### **Project Management**
- Prioritize deferred features (e.g., scraping tools, Google Custom Search API, admin traffic log). Confirm they will not block MVP launch.
- Approval on proposed deliverable timeline and migration priorities.

### **Testing/QA**
- Define key test scenarios for hierarchical data structures (parent/child nesting).
- Plan for thorough user testing of image annotation system to identify edge cases early.

### **Leadership**
- Approval of phased migration plan with focus on high-priority gaps.
- Clarify short-term vs. long-term business needs for deferred features.

---

This structured migration and implementation plan will ensure that the critical features of the Flask prototype are rebuilt with modern, scalable technologies while keeping non-essential features as optional for later development. The outlined deliverables, owner assignments, and priority-based schedule will help guide execution over the coming sprints, with cross-team collaboration to ensure alignment with the architect-first strategy.
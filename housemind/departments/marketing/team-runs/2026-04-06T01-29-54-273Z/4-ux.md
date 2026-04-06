### UX Researcher Output: User Journeys, Pain Points, Insights, and Recommendations

---

#### 1. **User Journeys and Interaction Flows**
Based on the platform's goals and target user personas (Architects, Contractors, Homeowners, and Suppliers), here are mapped user journeys for the annotation workspace:

**Architect: Collaborator, primary user**
- Log in to HouseMind with invite token → Create a new project → Upload images to carousel (reference designs) → Select relevant images for annotation → Use emoji pins to highlight design elements and issues (e.g., 📐 for measurements, 🚫 for errors, 🔄 for feedback) → Invite contractors/homeowners → Link products from the catalog to specific annotations → Use comments for further elaboration → Monitor team activity and respond to feedback.

**Contractor: Mobile user, field-oriented**
- Log in → View assigned project → Tap image carousel on mobile while at the job site → View annotations pinned by the architect → Tap a pin for context and reply or mark task complete → Access linked products for sourcing materials → Add personal annotations with emoji markers (notes/questions/feedback) while on-site → Provide feedback as required → Submit replies for architect/homeowner approval.

**Homeowner: Approver, collaborator**
- Log in on desktop/mobile → View image carousel from a shared project → Identify pinned emojis and click icons for details → Read comments and attempt to interpret annotations → Ask clarifying questions or leave feedback using emojis and comments → Check linked products for available alternatives.

**Supplier: Product provider**
- Log in → Navigate to catalog → Set product availability and update stock → View products linked by users for specific annotations → Propose similar products if stock is unavailable → Submit comments to architects/contractors → Track purchases or invoices resulting from annotations.

---

#### 2. **Identified Pain Points and Cognitive Loads**
Based on the user journeys and workflows outlined:

**General Discovery:**
- Risk: Users may not intuitively discover the long-press gesture for emoji menus.  
  **Solution:** Incorporate an onboarding tooltip, "Long-press to select emoji," and consider a visual cue for discoverability.

- Risk: Carousel navigation could become confusing with multiple images, particularly on mobile.  
  **Solution:** Implement a visual breadcrumb (e.g., numbered dots) below the carousel for clarity. Include swiping indicators.

**Architect-Specific Pain Points:**
- High cognitive load in tracking annotations when working with multiple pins and images.  
  **Solution:** Color-code or categorize annotations by emoji type, with a filtered “pin summary” panel.

- Difficulty understanding which audience (contractors/homeowners) can see or interact with specific comments or annotations.  
  **Solution:** Add role labels (e.g., Contractor/Homeowner/Architect) to each comment.

**Contractor-Specific Pain Points (Mobile-Heavy Usage):**
- Potential difficulty using small emojis and annotation pins with gloves or dirty hands in job-site conditions.  
  **Solutions:**
  - Enlarge the tappable radius of pins for easier editing.
  - Provide an alternative non-gesture-based way to add emojis (e.g., a floating "+ Add Annotation" button).
  - Test visibility in extreme lighting conditions to determine if pins and emojis are distinguishable.

- Navigation issues on smaller screens when switching between carousel, product panel, and annotation views.  
  **Solution:** Add persistent navigation tabs or sticky headers to ensure fluid switching across tasks.

**Homeowner-Specific Pain Points:**
- Difficulty interpreting emojis without proper tooltips/microcopy.  
  **Solution:** Ensure every clicked annotation pin has an info bubble explaining the emoji use and offering an option to "Ask for clarification" or "Reply."

**Supplier-Specific Pain Points:**
- Suppliers may not immediately understand their role in interacting with annotations or how to make their products discoverable and linkable.  
  **Solution:** Offer clear documentation/onboarding specifically for suppliers on how to enrich their product metadata for annotations.

---

#### 3. **Research Insights on Competitor Patterns (Figma/Miro/Pinterest)**
- **Figma:** Uses collaborative multiplayer cursors, clear visual pins, and comments anchored to objects. It allows threading and brings focus to updates with notification tracking. 
- **Miro:** Implements more active reminders such as badges/icons displaying ownership of comments or tasks.
- **Pinterest:** Leverages simplicity in UI/UX; annotation-like features center around “reaction” icons and direct linking.

Key Learning: **Brevity over density.** Keep the workspace minimal but functional, and design for "guided discoverability." Use animations to guide users when possible.

---

#### 4. **Usability Testing Plan**

**Research Goals:**
- Ensure that core tasks (image annotation, emoji selection, product linking) are discoverable, intuitive, and effortless across primary personas and device types.
- Optimize usability in job-site contexts (bad lighting, gloves, single-hand use).
- Test how beginners (homeowners and contractors) interpret annotations and interact with the system.

**Participants:**
- 3 architects (existing beta users).
- 3 contractors (job site emphasis + mobile users, varying tech-savvy levels). 
- 2 homeowners (less tech-savvy, visual interpreters).
- 2 suppliers (understand expectations for product linking).

**Test Scenarios:**
1. **Annotating Images (Architect):** 
   - Upload image to a carousel.
   - Add annotations with long-press gestures.
   - Link an emoji annotation to a product from the catalog.
  
2. **Navigation (Contractors):**
   - View projects and navigate through the image carousel.
   - Tap to learn details about emoji annotations.
   - Report additional feedback while on mobile.

3. **Role Visibility (Homeowners):**
   - Explore a collaborative project.
   - Respond to annotations with specific emoji/comment.

4. **Supplier Product Linking:** 
   - Upload product to catalog.
   - View projects where the product is referenced.
   - Respond to comments and confirm linked assignments.

**Methods:**
- Remote testing for architects and suppliers.
- On-site testing with contractors to evaluate real-world usage.
- Video recording for both observation and verbal feedback.

**Success Metrics:**
- Task Success Rate (e.g., % users who successfully complete annotation/pin tasks).
- Time on task for navigation + annotation.
- Error rates on key actions (misclicks, confusion with gestures).
- Post-task survey with SUS (System Usability Scale) for subjective usability satisfaction.

---

#### 5. **Accessibility Audit**
1. **Color Contrast:** Ensure contrast meets WCAG AA standards, especially for emoji icons and pins against diverse image backgrounds.
   - STRATEGY: Test using a color-contrast tool; pair light backgrounds with darker pins and tooltips.

2. **Screen Reader Support:** Annotations should have accessible labels for screen readers, e.g., “Scissors icon annotation, linked to Product X.”  
   - STRATEGY: Use `aria-label` or similar accessible attributes to provide clear descriptions.

3. **Gestures Alternatives:**
   - STRATEGY: Allow a tappable “Add Annotation” button as an alternative to long-press for cases where gestures fail/workarounds required.

4. **Typography:** Use a readable sans-serif font (e.g., Inter), ensuring legibility at smaller sizes for mobile use.

—

#### **Next Steps**
- Conduct user interviews with participants to gather stated needs and validate pain points.
- Collaborate with Art & UI designer on basic wireflows, considering mobile-first obstacles.
- Perform A/B testing to validate effective design for easy emoji discoverability. 


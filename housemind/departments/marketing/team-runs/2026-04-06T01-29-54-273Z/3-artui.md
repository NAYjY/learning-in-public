### **Art & UI Designer Output: High-Fidelity UI Design for Annotation Workspace**

---

#### **1. Image Carousel UI Design**

**Wireframe Description:**
The image carousel will have a bottom-aligned layout for mobile-first usability. Users can swipe left or right to navigate through images. Central image is displayed larger with a subtle drop shadow (`shadow-lg`),
while adjacent images (to indicate swipe options) are displayed smaller and slightly cropped (`scale-90`).

**Tailwind Styling Specs:**
- **Carousel Container:** `flex items-center space-x-2 overflow-x-auto`
- **Individual Image Card:**
  - Active image: `w-full h-72 bg-white rounded-lg shadow-lg`
  - Inactive image: `w-60 h-64 bg-gray-100 rounded-lg shadow-md opacity-70 scale-90`
- **Indicators:** Use dot indicators for the number of images. Active indicator styled as `w-3 h-3 bg-primary rounded-full`, inactive indicators `w-3 h-3 bg-gray-300 rounded-full`.

**Illustration/Icon Requirements:**
- Use placeholder icons from Tailwind (`upload` icons) for the “Add Image” button with class `text-gray-500 w-8 h-8`.

---

#### **2. Emoji Annotation Design**

**Wireframe Description:**
The annotation system will include a circular emoji selection menu activated via a long-press gesture. Emoji annotations will appear as pins (small circle markers) on the image, tap to edit or delete.

**UI Elements & Interaction Patterns:**
- **Circular Emoji Menu:** 
  - Pops up on long-press at the touch location.
  - Circular layout will showcase the emoji set in a radial alignment.
  - A central "close" button (`w-10 h-10 bg-gray-200 rounded-full`).
  - Selected emoji has an active state (`text-primary bg-secondary rounded-full`).
- **Annotation Pins:** Small, non-intrusive markers on the image. Interactivity:
  - **Default state:** `w-6 h-6 bg-primary rounded-full shadow-sm`
  - **Hover state:** `w-6 h-6 bg-secondary border-2 border-primary rounded-full`
  - **Selected state:** `w-8 h-8 border-2 border-accent shadow-lg`
  - Provide placement flexibility with drag interaction.

**Tailwind Styling Specs:**
- **Circular Emoji Menu:** 
  - Outer container: `absolute flex justify-center items-center w-24 h-24 rounded-full bg-white drop-shadow-lg`
- **Emoji sizes:** Designed for touch accuracy, use `text-4xl` Tailwind classes for emoji characters.
- **Pin marker:** `absolute w-6 h-6 rounded-full bg-primary`

**Custom Assets Checklist:**
- Circular menu background (gradient or flat color—#F9F9F9 for base with white border `border-white`).
- Emoji compatibility icons from an existing library; minimal illustration work needed.

---

#### **3. Product Linking UI**

**Wireframe Description:**
Users can link products to pins directly through the product panel. Tapping a pin will open the product linking modal:
1. **Search Option:** Mini search bar (`border border-gray-400 rounded-xl px-2 py-2`) for all products in the catalog.
2. **Add Product:** Paste product URL directly in the form field (`w-full p-2 rounded-md border bg-gray-50`).

**Tailwind Styling Specs:**
- **Modal Style:** Use `max-w-sm w-full bg-white rounded-xl p-4 shadow-md`
- **Input Field:** `w-full p-2 bg-gray-100 rounded-lg border border-gray-300`
- **Search Result Container:** `overflow-auto grid gap-2`
- **Search Results Item Card:** 
  - Card div: `p-2 bg-white rounded-xl border shadow-sm space-y-2`
  - Thumbnail image: `w-12 h-12 rounded-lg`
  - Text styling: `text-sm text-gray-700 truncate`

---

#### **4. Product Panel Design**

**Wireframe Description:**
Product panel is a collapsible drawer on the right side of the mobile UI. It displays available products that can be linked to annotations. Includes a "filter by active pins" checkbox.

**Tailwind Styling Specs:**
- **Product Panel Drawer:** `fixed top-0 right-0 h-full w-64 bg-white shadow-lg border-l`
- **Header:** `flex items-center justify-between px-4 py-3 bg-secondary text-white rounded-t-lg font-semibold text-lg`
- **Filter Option:** `flex items-center space-x-2 p-2 border-b`
- **Product Item Card:**
  - Thumbnail: `w-10 h-10 bg-gray-300 rounded-lg`
  - Label: `text-sm font-bold text-gray-700 truncate`
  - Category Tag: `text-xs text-gray-500`

---

#### **5. Bilingual Functionality**

**Proposed Adjustments:**
Given Thai’s longer word constructions:
- Allow titles and labels to use `text-sm md:text-base` classes to optimize space.
- Wrap text automatically (`break-word`) while leaving sufficient line height (`leading-relaxed`) for clarity.

---

#### **6. Deliverables**

**High-Fidelity Mockups:** 
- Design screens for carousel, emoji menu, pin creation/editing, product linking UI, and the product panel.
- Interaction animations: Basic long-press effects, circular emoji menu animation, pin placement and deletion transitions.

**Color Palette:**
- **Primary Color:** #2196F3 (Bright Blue)  
- **Secondary Color:** #FFEB3B (Warm Yellow)  
- **Accent Color:** #FF5722 (Bold Orange)  
- **Background:** #F9F9F9 (Muted White)  
- **Text:** #212121 (Deep Gray)  

**Typography:**
- **Font family:** "Prompt," sans-serif.
- **Header font:** `text-lg font-semibold text-primary`.  
- **Body font:** `text-sm font-normal text-gray-700`.

**Emoji Sizes:**
- **Circular Menu:** Emoji `text-4xl`.  
- **Pins:** Emoji marker size capped at `text-2xl`.  

**Custom Assets:**
- Circular emoji menu graphic.
- Minimal empty-state illustration placeholders (cartoon style, flat design).
- Loading animation (circular spinner that includes subtle reference to the platform's identity, e.g., a small house icon incorporated into the spinner).

Feedback welcome! Let Art & UI know if more details or visual refinements are needed.
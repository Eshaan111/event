# Design System Strategy: Sophisticated Structure

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Architectural Ether."** 

This system is an intentional collision between the weightless, "Floating Studio" aesthetic and the disciplined, rigid foundations of "Architectural Brutalism." We are moving away from the generic "app-like" feel toward a high-end editorial experience. The goal is to create interfaces that feel like curated gallery spaces: airy, yet grounded by deliberate structural lines.

### The Signature Look
Unlike standard UI kits that rely on heavy shadows or flat cards, this system utilizes **Tonal Layering** and **Chalky Matte Surfaces**. We break the "template" look by using:
*   **Intentional Asymmetry:** Strategic use of whitespace and off-center typography scales.
*   **Structural Precision:** 1px "Ghost Borders" in muted emerald or charcoal to define boundaries without clutter.
*   **Editorial Typography:** High-contrast sizing between massive `display` headings and functional `label` text.

---

## 2. Colors & Surface Philosophy

Our palette is rooted in "Chalky Neutrals" and "Deep Botanical" tones. The primary color (`#40665a`) acts as our structural anchor.

### The "No-Line" Rule for Layout
Prohibit the use of 1px solid borders for primary sectioning. Instead, define major zones (Hero vs. Content) through background color shifts. Use `surface-container-low` (`#f0f4f3`) against a `background` (`#f8faf9`) to create a boundary that is felt rather than seen.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical, matte sheets. 
*   **Nesting:** Place a `surface-container-lowest` (#ffffff) element inside a `surface-container` (#e9efee) to create a natural, "carved" lift.
*   **The Glass & Gradient Rule:** For floating headers or persistent actions, use **Glassmorphism**. Apply `surface` colors with 80% opacity and a `24px` backdrop-blur. 
*   **Signature Gradients:** For primary CTAs, use a subtle linear gradient from `primary` (#40665a) to `primary-dim` (#345a4e). This adds a "weighted" feel that flat color lacks.

---

## 3. Typography: The Editorial Voice

We pair **Space Grotesk** (Geometric, Brutalist) with **Manrope** (Functional, Modern) to achieve a sophisticated balance.

*   **Display & Headlines (Space Grotesk):** These are the "architectural" elements. Use `display-lg` (3.5rem) with tight letter-spacing (-0.02em) to command the page.
*   **The Functional Body (Manrope):** All reading content uses Manrope for its high legibility. 
*   **Labeling (Space Grotesk):** Small labels (`label-md`) must be in Space Grotesk, often in All-Caps with 0.05em tracking, to mirror architectural blueprints.

---

## 4. Elevation & Depth

We eschew traditional "drop shadows" for a more sophisticated, ambient approach.

*   **The Layering Principle:** Depth is achieved by stacking the surface-container tiers. For example, a `surface-container-highest` navigation bar sits naturally above a `surface-container-low` body.
*   **Ambient Shadows:** If an element must "float" (like a Modal), use an extra-diffused shadow: `0px 20px 48px rgba(42, 52, 52, 0.06)`. The color is a tint of our `on-surface` (#2a3434), never pure black.
*   **The "Ghost Border":** Boundaries for components (like input fields or cards) must use a `1px` border with `outline-variant` (#a9b4b3) at **20% opacity**. This creates a "hairline" effect that feels premium and technical.
*   **Roundedness Scale:** We reject the "pilled" look of modern web-design. Our maximum radius is `xl` (1.5rem/24px) or `32px` for large containers. This maintains a structured, "built" feel.

---

## 5. Components

### Buttons
*   **Primary:** `primary` background, `on-primary` text. No border. Radius: `md` (0.75rem).
*   **Secondary:** `surface` background with a 1px `outline` border.
*   **Tertiary:** `on-surface` text with no background. Use `label-md` (Space Grotesk) for the font style.

### Input Fields
*   **Surface:** `surface-container-lowest`.
*   **Border:** 1px `outline-variant` at 20% opacity. On focus, the border becomes `primary` at 100% opacity.
*   **Labels:** Always use `label-sm` (Space Grotesk) positioned above the field for a technical, data-entry aesthetic.

### Cards & Lists
*   **No Dividers:** Prohibit horizontal lines in lists. Use `16px` or `24px` of vertical whitespace to separate items.
*   **Interaction:** On hover, a card should shift from `surface-container-low` to `surface-container-high`. Do not add a shadow; change the "chalk" tone of the surface instead.

### Signature Component: The "Metadata Bar"
A horizontal or vertical strip using `surface-dim` with `1px` Ghost Borders. Use this for supplementary info (dates, tags, IDs) to reinforce the "Structured" branding.

---

## 6. Do's and Don'ts

### Do
*   **Do** use extreme contrast in typography sizing to create an editorial feel.
*   **Do** use "Chalky" matte finishes (background color shifts) instead of heavy shadows.
*   **Do** keep 1px borders delicate and muted. They should be a discovery, not a distraction.
*   **Do** embrace asymmetry. Allow elements to overlap slightly to create depth.

### Don't
*   **Don't** use 100% opaque, dark borders between sections.
*   **Don't** use "Full" (9999px) roundness for buttons or cards; keep it to the `24px-32px` range to maintain structure.
*   **Don't** use standard "Grey" shadows. Always tint shadows with the `on-surface` hue.
*   **Don't** clutter the UI. If a layout feels busy, remove a border and increase the whitespace.
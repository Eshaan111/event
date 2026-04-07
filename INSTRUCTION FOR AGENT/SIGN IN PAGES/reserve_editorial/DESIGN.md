```markdown
# Design System Document: The Editorial Frame

## 1. Overview & Creative North Star

This design system is built upon the **Creative North Star: The Digital Monograph.** 

We are moving away from the "app-like" density of traditional SaaS interfaces and toward the expansive, intentional atmosphere of high-end print media. This system treats the viewport as a curated page rather than a grid of containers. By leveraging dramatic typographic scale, a restricted "Ink & Paper" palette, and intentional asymmetry, we create an experience that feels less like a tool and more like a destination.

The goal is to break the "template" look. We achieve this by allowing typography to bleed into the background as a "glazing" texture and by using white space not just as a gap, but as a structural element that guides the eye.

---

## 2. Colors

The palette is rooted in a "Pristine & Ink" philosophy. It utilizes a sophisticated off-white base to reduce eye strain and provide a warmer, more premium feel than pure digital white.

### The "No-Line" Rule
To maintain a high-end editorial aesthetic, **1px solid borders are strictly prohibited for sectioning.** Conventional UI uses lines to separate content; this design system uses "Tonal Transitions." Boundaries must be defined through background color shifts. For example, a `surface-container-low` (#f4f3f2) section should sit directly against a `surface` (#faf9f8) background to create a soft, sophisticated edge.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers, like stacked sheets of fine cotton paper.
- **Base Layer:** `surface` (#faf9f8).
- **Secondary Sectioning:** `surface-container-low` (#f4f3f2) for large content blocks.
- **Elevated Components:** Use `surface-container-lowest` (#ffffff) for cards or interactive elements to make them "pop" against the creamier background.

### The "Glass & Gradient" Rule
To add "soul" to the minimalist palette:
- **Glassmorphism:** Use semi-transparent `surface` colors with a 20px–40px backdrop-blur for floating navigation bars or modals. This prevents the UI from feeling "pasted on" and integrates it into the background.
- **Signature Textures:** For primary CTAs or high-impact hero sections, use a subtle linear gradient transitioning from `primary` (#000000) to `primary_container` (#3b3b3b). This adds a "weighted ink" depth that flat black lacks.

---

## 3. Typography

Typography is the primary visual driver of this system. We use a high-contrast pairing of a classical serif and a functional sans-serif.

- **The Voice (Newsreader):** Used for all `display`, `headline`, and `subtitle` roles. It conveys authority and a "Starbucks-esque" cafe sophistication. 
- **The Engine (Work Sans):** Used for `body` and `label` roles. Its clean, geometric nature ensures legibility and modernizes the classical serif.

### Typographic "Glazing"
A signature technique of this system is using `display-lg` text as a background element. Set large-scale serif letters at 3%–5% opacity using the `on_surface` token. This acts as a watermark or "glaze," creating a textured, editorial look that fills expansive white space without adding cognitive load.

---

## 4. Elevation & Depth

We eschew traditional Material Design "dropshadows" in favor of **Tonal Layering.**

### The Layering Principle
Depth is achieved by "stacking" the surface-container tiers. Placing a `#ffffff` (lowest) card on a `#f4f3f2` (low) background creates a natural lift that feels like physical paper.

### Ambient Shadows
When a floating effect is necessary (e.g., a dropdown or primary modal), use "Ambient Shadows":
- **Blur:** 30px–60px.
- **Opacity:** 4%–8%.
- **Color:** Use a tinted version of `on_surface` (#1a1c1c) rather than pure grey to mimic natural light dispersion.

### The "Ghost Border" Fallback
If a container requires a border for accessibility, use a **Ghost Border**: the `outline_variant` (#c6c6c6) token at 15% opacity. Never use 100% opaque borders.

---

## 5. Components

### Buttons
- **Primary:** Solid `primary` (#000000) with `on_primary` (#e2e2e2) text. Roundedness: `md` (0.375rem).
- **Secondary:** Ghost Border (15% opacity) with `primary` text.
- **Tertiary:** Text-only, using `title-sm` with a subtle 1px underline that appears on hover.

### Cards & Lists
- **Rule:** Absolute prohibition of divider lines. 
- **Execution:** Separate list items using vertical white space (32px+) or alternating background shifts between `surface` and `surface-container-low`.
- **Cards:** No borders. Use `surface-container-lowest` (#ffffff) with a `sm` (0.125rem) corner radius and an Ambient Shadow.

### Input Fields
- **Style:** Clean, "Underline-only" or "Ghost Border" style. 
- **Focus State:** Transition the border from 15% opacity to 100% `primary` black. Use `label-md` for floating labels to maintain the editorial feel.

### Selection Controls (Checkboxes/Radios)
- Use `primary` (#000000) for selected states. Ensure the "unchecked" state is a very faint `outline_variant` to keep the UI looking "airy" and unencumbered by heavy UI chrome.

---

## 6. Do's and Don'ts

### Do:
- **Embrace Asymmetry:** Place a `display-lg` headline off-center to create a sense of movement.
- **Use Breathable Margins:** Increase your standard gutters by 1.5x. This system thrives on "expensive" white space.
- **Layer Text over Text:** Use the "Glazing" effect to create depth behind active content.

### Don't:
- **Don't use "Grid-Blockiness":** Avoid filling every column of a grid. Let elements float.
- **Don't use High-Contrast Dividers:** Never use a solid dark line to separate content. Use a color shift or space.
- **Don't use Standard Shadows:** Avoid small, dark, "fuzzy" shadows. If it doesn't look like ambient light hitting paper, it’s too heavy.
- **Don't Over-Round:** Stick to `sm` and `md` (0.125rem - 0.375rem) for a sophisticated, professional look. Avoid `full` rounding except for small chips or tags.

---

## 7. Accessibility Note
While we favor soft contrasts for "airiness," all functional text (`body-md`, `label-md`) must maintain a contrast ratio of at least 4.5:1 against its background. Use the `on_surface` (#1a1c1c) token to ensure readability is never sacrificed for the sake of the editorial aesthetic.```
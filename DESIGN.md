# Design System Inspired by Filotaxia

## 1. Visual Theme & Atmosphere

Filotaxia's design system embodies a minimalist, nature-inspired aesthetic rooted in organic forms and botanical exploration. The visual language is deliberately refined and spacious, leveraging substantial whitespace to create an air of contemplation and discovery. The system emphasizes bold typography paired with understated navigation, creating a meditative interface that feels like encountering living art. The aesthetic celebrates the intersection of natural form and harmonic resonance—each element is carefully placed to evoke the particularities of plant geometry and musical vibration. This is a design system for a sophisticated, experimental audience that appreciates precision, restraint, and the subtle interplay between negative space and meaningful content.

**Key Characteristics**
- Extreme minimalism with substantial whitespace
- Bold, large-scale typography anchoring compositions
- Nature-inspired earthy palette with deep neutrals
- Soft, organic accent colors evoking soil and botanical warmth
- Underline and border-based navigation indicators
- High-contrast monochromatic hierarchy
- Meditative, unhurried pacing
- Experimental, artistic sensibility

## 2. Color Palette & Roles

### Primary
- **Deep Navy** (`#1F2E3D`): Primary brand color for structured elements, rarely used prominently; establishes depth and sophistication
- **Pure Black** (`#000000`): Dominant text color, typography, and foundational UI elements across the system
- **Pure White** (`#FFFFFF`): Primary background, negative space, and clean surfaces

### Accent Colors
- **Warm Terracotta** (`#FF6B35`): Energetic accent for highlighting key moments and calls-to-action; rarely deployed
- **Earth Brown** (`#B4742D`): Botanical warmth; secondary accent for contextual emphasis
- **Cream Beige** (`#FBE9D0`): Soft, warm background option for content containers; organic feel

### Interactive
- **Black** (`#000000`): Primary button background for strong calls-to-action
- **White** (`#FFFFFF`): Text on dark backgrounds; interactive element contrast

### Neutral Scale
- **Charcoal** (`#404040`): Deep gray for secondary text or slightly de-emphasized content
- **Medium Gray** (`#808080`): Mid-tone for dividers, subtle backgrounds, disabled states
- **Light Gray** (`#A0A0A0`): Tertiary text, lighter dividers
- **Lighter Gray** (`#A3A3A3`): Subtle borders, faint backgrounds
- **Pale Gray** (`#DFDFDF`): Minimal visual weight borders and hairline dividers

### Status & Semantic
- **Error Red** (`#FF0000`): Error states, validation failures, and critical alerts

## 3. Typography Rules

### Font Family
**Primary Font Stack:** PP Neue Montreal, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
**Secondary Font Stack:** Arial, sans-serif

PP Neue Montreal is used for headings, navigation, and high-impact content. Arial is used for auxiliary text, buttons, and interactive elements.

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|-----------------|-------|
| Display XL (h1) | PP Neue Montreal | 302px | 500 | 310px | 0px | Hero/full-screen impact, rarely used |
| Display L (h1) | PP Neue Montreal | 140px | 400 | 126px | 0px | Large section headers, bold presence |
| Heading L (h2) | PP Neue Montreal | 70px | 400 | 76px | 0px | Section anchors, substantial visual weight |
| Heading M (h3) | PP Neue Montreal | 40px | 400 | 44px | 0px | Subsection titles, prominent content markers |
| Heading S (h4) | PP Neue Montreal | 20px | 400 | 26px | 0px | Block titles, form labels |
| Body Default | Arial | 20px | 400 | normal | 0px | Primary readable text, navigation, buttons |
| Button / Link | Arial | 20px | 400 | normal | 0px | Interactive text elements |
| Link (secondary) | PP Neue Montreal | 20px | 400 | 30px | 0px | Navigation links with extended line height |

### Principles
- **Scale with Purpose:** Font sizes jump in substantial increments (from 20px to 40px, 70px, 140px) to create dramatic visual hierarchy and clear content zones
- **Weight Restraint:** System uses only 400 (Regular) and 500 (Medium) weights; no ultra-light or bold extremes
- **Line Height Generosity:** Headings receive proportionally large line heights to accommodate scale; body text remains compact but readable
- **Minimalist Color:** All typography defaults to black or white; no colored text variants
- **Consistent Letter Spacing:** No custom letter-spacing beyond 0px; rely on typeface metrics for natural legibility

## 4. Component Stylings

### Buttons

#### Primary Button (Solid Black)
- **Background:** `#000000`
- **Text Color:** `#FFFFFF`
- **Padding:** `14px 24px 14px 24px`
- **Font Size:** `18px`
- **Font Family:** Arial
- **Font Weight:** `400`
- **Line Height:** normal
- **Border:** `0px none`
- **Border Radius:** `0px`
- **Box Shadow:** none
- **Width:** auto
- **Height:** `52px`
- **Hover State:** Opacity `0.8`
- **Active State:** Opacity `0.6`

#### Secondary Button (Ghost/Transparent)
- **Background:** transparent / `rgba(0, 0, 0, 0)`
- **Text Color:** `#000000`
- **Padding:** `0px 76px 14px 0px`
- **Font Size:** `20px`
- **Font Family:** Arial
- **Font Weight:** `400`
- **Line Height:** normal
- **Border:** `0px none`
- **Border Radius:** `0px`
- **Box Shadow:** none
- **Width:** auto
- **Height:** `41px`
- **Hover State:** Text underline (1px solid `#000000`)
- **Active State:** Underline remains

#### Icon/Text Button (Minimal)
- **Background:** transparent / `rgba(0, 0, 0, 0)`
- **Text Color:** `#FFFFFF`
- **Padding:** `0px 0px 0px 0px`
- **Font Size:** `20px`
- **Font Family:** Arial
- **Font Weight:** `400`
- **Line Height:** normal
- **Border:** `0px none`
- **Border Radius:** `0px`
- **Box Shadow:** none
- **Width:** auto
- **Height:** auto
- **Hover State:** Opacity `0.7`

### Navigation

#### Primary Navigation Bar
- **Background:** transparent / `rgba(0, 0, 0, 0)`
- **Text Color:** `#000000`
- **Padding:** `25px 0px 0px 0px`
- **Font Size:** `20px`
- **Font Family:** PP Neue Montreal
- **Font Weight:** `400`
- **Line Height:** `26px`
- **Border:** `0px none`
- **Border Radius:** `0px`
- **Box Shadow:** none
- **Width:** `1440px` (or 100%)
- **Height:** `90px`
- **Alignment:** Flex, space-between
- **Active Link Indicator:** Bottom border `1px solid #000000`
- **Hover State:** Text opacity `0.6` or underline appears

### Links

#### Text Link (Primary)
- **Background:** transparent / `rgba(0, 0, 0, 0)`
- **Text Color:** `#000000`
- **Padding:** `0px 0px 0px 0px`
- **Font Size:** `20px`
- **Font Family:** PP Neue Montreal
- **Font Weight:** `400`
- **Line Height:** `26px`
- **Border:** `0px none`
- **Border Radius:** `0px`
- **Box Shadow:** none
- **Width:** auto
- **Height:** auto
- **Hover State:** Bottom border `1px solid #000000`
- **Active State:** Border remains visible

#### Text Link (Secondary)
- **Background:** transparent / `rgba(0, 0, 0, 0)`
- **Text Color:** `#000000`
- **Padding:** `0px 0px 0px 0px`
- **Font Size:** `20px`
- **Font Family:** PP Neue Montreal
- **Font Weight:** `400`
- **Line Height:** `30px`
- **Border:** `0px none`
- **Border Radius:** `0px`
- **Box Shadow:** none
- **Width:** auto
- **Height:** auto
- **Hover State:** Underline appears `1px solid #000000`

### Cards & Containers

#### Content Card
- **Background:** `#FFFFFF` or `#FBE9D0` (warm option)
- **Border:** `1px solid #DFDFDF`
- **Border Radius:** `0px`
- **Padding:** `24px` (or `32px`, `40px` depending on content)
- **Box Shadow:** none (or minimal: `0px 1px 3px rgba(0, 0, 0, 0.1)`)
- **Margin:** Default spacing from adjacent content

### Inputs & Forms

#### Text Input / Textarea
- **Background:** `#FFFFFF`
- **Border:** `1px solid #DFDFDF`
- **Border Radius:** `0px`
- **Padding:** `12px 16px 12px 16px`
- **Font Size:** `18px`
- **Font Family:** Arial
- **Font Weight:** `400`
- **Line Height:** normal
- **Text Color:** `#000000`
- **Placeholder Color:** `#A3A3A3`
- **Focus State:** Border color changes to `#000000`
- **Error State:** Border color `#FF0000`
- **Disabled State:** Background `#F5F5F5`, Border `#DFDFDF`, Text color `#A0A0A0`, Opacity `0.5`

## 5. Layout Principles

### Spacing System
**Base Unit:** `4px`

**Scale:**
- `4px` — Micro spacing, tight gaps within components
- `8px` — Compact spacing between related elements
- `12px` — Standard gap between form fields
- `16px` — Default margin between content blocks
- `20px` — Standard gap for component layouts
- `24px` — Padding inside containers, breathing room
- `32px` — Significant breathing room between sections
- `40px` — Large margin, section separation
- `60px` — Vertical rhythm between major sections
- `72px` — Large padding for substantial container breathing
- `80px` — Hero section spacing
- `160px` — Maximum breathing between full-width sections

**Usage Context:**
- Micro spacing (`4px`, `8px`): Form field spacing, icon-text gaps, inline element clusters
- Standard spacing (`12px`, `16px`, `20px`, `24px`): Container padding, component margins, primary layout rhythm
- Large spacing (`32px`, `40px`, `60px`, `80px`, `160px`): Section breaks, hero sections, full-width content separation

### Grid & Container
- **Max Width:** `1440px` (full-bleed on desktop)
- **Column Strategy:** 12-column grid with flexible column spans; can scale to single-column on mobile
- **Gutter Width:** `20px` between columns
- **Padding:** `24px` to `40px` on left/right at various breakpoints
- **Section Pattern:** Full-width containers with internal padding; alternate between light and dark backgrounds (`#FFFFFF`, `#FBE9D0`)

### Whitespace Philosophy
Whitespace is treated as an active design element, not wasted space. The system embraces generous negative space to:
- Allow typography to breathe and command attention
- Create visual pauses between content zones
- Evoke a meditative, unhurried browsing experience
- Prevent visual overwhelm; prioritize content hierarchy
- Enable clear scanning and navigation
- Emphasize organic, natural layouts

### Border Radius Scale
- **Sharp Corners:** `0px` — Default for all components, cards, buttons, inputs (architectural, refined aesthetic)
- **Circular:** `50%` — Rare, used only for specific interactive micro-elements or badges (explicit data point in extracted tokens)

*Note: This design system favors sharp, architectural lines consistent with minimalist/Swiss design principles. Curves are avoided except in exceptional cases.*

### Border Widths
- **Thin / Hairline:** `1px` — Dividers, subtle borders between sections, input focus states, navigation underlines
- **No other stroke weights in system** — Binary approach: either `1px` or no border

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Base (0) | No shadow, flat | Primary content surfaces, buttons, standard components |
| Raised (1) | `0px 2px 4px rgba(0, 0, 0, 0.08)` | Hover states on cards, subtle lift |
| Floating (2) | `0px 4px 8px rgba(0, 0, 0, 0.12)` | Dropdown menus, popovers, transient surfaces |
| Modal (10+) | `0px 8px 16px rgba(0, 0, 0, 0.2)` | Modal overlays, full-screen dialogs |

**Shadow Philosophy:**
This design system prioritizes flatness and minimalism over dimensional depth. Shadows are used sparingly and subtly to indicate elevation only when interactive state change or layering is essential. The default approach is to rely on borders (`1px solid #DFDFDF`) and layout positioning rather than shadows. When shadows do appear, they use soft, diffused black at low opacity to maintain the refined, airy aesthetic.

### Opacity Levels
- **Default / Full:** `1.0` — All primary content
- **Hover:** `0.8` — Interactive elements on hover (buttons, links)
- **Focus / Active:** `0.6` — Pressed button state, strong emphasis
- **Disabled:** `0.5` — Form inputs, unavailable buttons
- **Subtle / Secondary:** `0.3` — Placeholder text, ghost elements
- **Overlay / Backdrop:** `0.4` to `0.6` — Modal or fullscreen overlays

### Z-index / Layering
- **Base Content:** `1` — Standard page elements
- **Sticky Navigation:** `100` — Persistent header, stays above most content
- **Sticky High:** `999` — Special sticky elements, near-top layering
- **Dropdown / Popovers:** `10` — Transient menus just above base content
- **Modal / Dialog:** `1000` — Full-screen dialogs, modal windows
- **Toast / Notification:** `9999` — Highest layer, transient notifications ensure visibility

## 7. Do's and Don'ts

### Do
- **Embrace whitespace generously.** Let content breathe; use the full height and width of the viewport
- **Lead with typography.** Bold, large headlines anchor sections; use size and weight to establish hierarchy
- **Use consistent `1px` borders.** All dividers and subtle structure employ thin, architectural lines
- **Apply sharp corners (`0px` radius) universally.** Maintains the geometric, refined aesthetic
- **Stack elements vertically.** Favor column-based layouts; horizontal overflow is avoided
- **Underline for interaction.** Navigation links and secondary actions show state through underlines, not color changes
- **Minimize color; maximize contrast.** Rely on black/white hierarchy; deploy accent colors (`#FF6B35`, `#B4742D`) sparingly for critical moments
- **Keep buttons dark and text white.** Primary CTAs use `#000000` background; secondary actions remain transparent with black text
- **Right-align actions and navigation.** Information flows left, interactions right
- **Test legibility at scale.** Large typography demands careful sizing; ensure headlines remain crisp

### Don't
- **Avoid rounded corners.** Do not use border-radius beyond `50%` for micro-elements
- **Don't crowd content.** Resist the urge to fill whitespace; embrace negative space
- **Avoid drop shadows for emphasis.** Use borders and opacity instead; shadows are minimal and diffuse
- **Don't use colored text.** Keep typography black (`#000000`) or white (`#FFFFFF`) only
- **Avoid thin, light typefaces.** PP Neue Montreal and Arial at weights 400–500 only; no weight extremes
- **Don't layer multiple accent colors.** Deploy `#FF6B35` or `#B4742D` individually, not in combination
- **Avoid small touch targets.** Buttons should be at least `44px` tall; links at least `20px` font size
- **Don't auto-play media.** Respect user intention; all interactions should be deliberate
- **Avoid status color bloat.** Only `#FF0000` for errors; avoid green/yellow/blue status indicators
- **Don't break the grid.** Maintain consistent `20px` gaps and `24px` padding across sections

## 8. Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile | 320px–599px | Single-column layout, `16px` padding, headline sizes reduce to 80%–90%, touch targets minimum `44px × 44px`, navigation collapses to burger menu or vertical stack |
| Tablet | 600px–1023px | 2-column grid or flexible layout, `24px` padding, headline sizes at 85%–95% of desktop, spacing reduces to `40px` between sections |
| Desktop | 1024px–1439px | 12-column grid, `40px` padding, full typography scale, standard spacing (`60px`, `80px` between sections) |
| Large Desktop | 1440px+ | Max-width container `1440px` centered, full spacing scale, no layout changes |

### Touch Targets
- **Minimum Size:** `44px × 44px` for all interactive elements (buttons, links, form inputs)
- **Ideal Size:** `52px` for buttons, `48px` for link text
- **Spacing Between Targets:** Minimum `12px` gap to prevent accidental adjacent taps
- **Padding Strategy:** Increase padding-y and padding-x on mobile to accommodate larger touch zones without growing visual size

### Collapsing Strategy
- **Typography:** Reduce display heading sizes on mobile (302px → 120px, 140px → 80px, 70px → 48px) using CSS media queries or fluid sizing
- **Spacing:** Collapse margins and gaps by ~30% on tablet, ~50% on mobile (e.g., `60px` → `40px` → `20px`)
- **Layout:** Stack all flex rows to `flex-direction: column` on mobile; maintain 2-column grids on tablet where feasible
- **Navigation:** Horizontal header menu collapses to vertical stack or off-canvas menu below `600px`
- **Content Width:** Reduce max-width container to `100%` with padding on mobile; expand to `90%` or `1440px` on desktop
- **Images & Media:** Scale to `100%` width on mobile, maintain aspect ratio with `object-fit: cover`

## 9. Agent Prompt Guide

### Quick Color Reference
- **Primary CTA Button Background:** Black (`#000000`)
- **Primary CTA Button Text:** White (`#FFFFFF`)
- **Primary Text / Headings:** Black (`#000000`)
- **Backgrounds:** White (`#FFFFFF`) or Cream Beige (`#FBE9D0`)
- **Secondary Accents:** Terracotta (`#FF6B35`), Earth Brown (`#B4742D`)
- **Borders / Dividers:** Light Gray (`#DFDFDF`), Medium Gray (`#A3A3A3`)
- **Error States:** Red (`#FF0000`)
- **Navigation Links:** Black (`#000000`) with underline on hover

### Iteration Guide
1. **Default to zero radius.** All buttons, cards, inputs use `border-radius: 0px` unless explicitly a circular element (`50%`)
2. **Typography hierarchy via size, not weight.** Use PP Neue Montreal at weights 400–500 for all headings; scale from 20px to 302px; no color variance
3. **Borders over shadows.** All divisions between components use `1px solid #DFDFDF`; shadows (`0px 2px 4px rgba(0, 0, 0, 0.08)`) only on interactive hover states or modals
4. **Spacing in multiples of 4px.** All gaps, padding, margins scale to base `4px` unit: 4, 8, 12, 16, 20, 24, 32, 40, 60, 72, 80, 160
5. **Navigation underlines for interaction state.** Links, buttons, and navigation items reveal `1px solid #000000` bottom border on `:hover` and `:focus` states; no background color changes
6. **Buttons: solid black primary, transparent secondary.** Primary CTA: `background: #000000; color: #FFFFFF; padding: 14px 24px`. Secondary: `background: transparent; color: #000000; border: none`. No color transitions; use opacity fades
7. **Whitespace is intentional.** Allow minimum `60px` margins between major sections; do not fill every pixel; empty space creates the meditative visual rhythm
8. **Inputs match card style.** Text inputs, textareas: `border: 1px solid #DFDFDF; background: #FFFFFF; padding: 12px 16px`. On focus: `border-color: #000000`
9. **Accent colors sparingly.** Deploy `#FF6B35` or `#B4742D` for one-two key moments per page; rest of interface remains black/white
10. **Mobile-first scaling.** Reduce typography and spacing by ~40–50% at breakpoints below 600px; use flexible units or media queries to maintain proportional hierarchy
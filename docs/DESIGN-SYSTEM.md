# TRADUMUST Design System

**Version 1.0** · Institutional accessibility platform · WCAG 2.2 AA target

---

## 1. Design principles

| Principle | Meaning |
|-----------|---------|
| **Clarity over decoration** | No gradient blobs, glass blur, or playful motion. Content and function first. |
| **Institutional trust** | Palette and typography suited to universities, healthcare, and public-sector accessibility. |
| **Accessibility by default** | Contrast ≥ 4.5:1 for body text, visible focus rings, reduced-motion support, semantic HTML. |
| **Consistency** | One token set, one component library, one spacing scale across marketing and app. |

---

## 2. Color palette

### Light mode (default)

| Token | Hex | Usage |
|-------|-----|--------|
| `--background` | `#F4F6F8` | Page background |
| `--surface` | `#FFFFFF` | Cards, panels, nav |
| `--surface-muted` | `#EEF1F5` | Alternating sections |
| `--foreground` | `#0F1A2A` | Headings, primary text |
| `--text-secondary` | `#4A5568` | Body, descriptions |
| `--text-muted` | `#718096` | Captions, meta |
| `--brand-primary` | `#0B5E6A` | Primary actions, active nav |
| `--brand-primary-hover` | `#094954` | Button hover |
| `--brand-secondary` | `#1E3A5F` | Secondary emphasis, footer |
| `--brand-accent` | `#0EA5C9` | Links, focus accents |
| `--border` | `#D5DCE4` | Dividers, card borders |
| `--success` | `#0D7A4E` | Correct states |
| `--warning` | `#B45309` | Alerts |
| `--error` | `#B91C1C` | Errors |

### Dark mode

| Token | Hex |
|-------|-----|
| `--background` | `#0A1219` |
| `--surface` | `#111B27` |
| `--foreground` | `#EDF2F7` |
| `--brand-primary` | `#2DA8B8` |

**Do not use:** indigo `#4F46E5`, purple `#A855F7`, violet gradients, or “startup SaaS” pill nav bars.

---

## 3. Typography

**UI / body:** IBM Plex Sans  
**Display / hero:** IBM Plex Sans (weight 600–700, tight tracking)

| Scale | Size | Weight | Use |
|-------|------|--------|-----|
| Display | 3rem–3.75rem | 700 | Hero H1 |
| H1 | 2.25rem | 600 | Page titles |
| H2 | 1.875rem | 600 | Section titles |
| H3 | 1.25rem | 600 | Card titles |
| Body | 1rem | 400 | Paragraphs |
| Small | 0.875rem | 400 | Meta, labels |
| Overline | 0.75rem | 600 | Section labels (uppercase, letter-spacing 0.08em) |

Line height: 1.5 body, 1.2 headings. Max line width for prose: `65ch`.

---

## 4. Spacing & layout

Base unit: **4px**

| Token | Value |
|-------|-------|
| Section padding Y | `5rem` (mobile `3rem`) |
| Container max | `72rem` (1152px) |
| Content max (prose) | `42rem` |
| Grid gap | `1.5rem` / `2rem` |

**Breakpoints:** `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280

---

## 5. Radius & elevation

| Token | Value |
|-------|-------|
| `--radius-sm` | 4px |
| `--radius-md` | 6px |
| `--radius-lg` | 8px |

Shadows (subtle only):

- `--shadow-sm`: `0 1px 2px rgba(15, 26, 42, 0.06)`
- `--shadow-md`: `0 4px 12px rgba(15, 26, 42, 0.08)`

No colored glow shadows.

---

## 6. Components

### Button

- **Primary:** solid `--brand-primary`, white text, 6px radius, min-height 44px
- **Secondary:** white surface, `--border` outline
- **Ghost:** text only, hover surface-muted

### Card (`surface-card`)

White background, 1px border, `--radius-lg`, optional `--shadow-sm`.

### Navigation (marketing)

Fixed top bar; solid white + border on scroll. Horizontal links, no pill container. Logo left, actions right.

### Navigation (app / dashboard)

Left sidebar, navy or white surface. Active item: left border accent + muted background.

### Form inputs

Height 44px, border `--border`, focus ring 2px `--brand-accent`. Labels always visible (no placeholder-only).

### Badge / overline

Uppercase 12px, `--brand-primary` or `--text-muted`, used for section labels.

---

## 7. Page inventory

| Route | Purpose | Layout |
|-------|---------|--------|
| `/` | Marketing landing | Marketing nav + sections |
| `/login`, `/register` | Auth | Centered card, minimal chrome |
| `/dashboard` | App home | Dashboard shell |
| `/sign` | Text → Avatar | Dashboard shell |
| `/recognize` | Webcam | Dashboard shell |
| `/learn` | Learning | Dashboard shell |
| `/history`, `/profile` | User data | Dashboard shell |
| `/admin` | Analytics | Dashboard shell |

---

## 8. Landing page sections (order)

1. Hero — headline, subcopy, dual CTA, product screenshot frame  
2. Trust bar — stats (languages, signs, compliance)  
3. Features — 3 columns, icon + title + link  
4. How it works — 3 numbered steps  
5. Languages — ASL / BSL / LSF cards  
6. Testimonials  
7. Partners / institutions  
8. FAQ (accessible `<details>`)  
9. Contact  
10. Final CTA  
11. Footer — links, legal, accessibility statement  

---

## 9. Accessibility checklist

- [ ] Skip link to `#main-content`
- [ ] All icons paired with text or `aria-label`
- [ ] Focus visible on all interactive elements
- [ ] Color not sole indicator of state
- [ ] `prefers-reduced-motion` disables animations
- [ ] Form errors announced (`role="alert"`)
- [ ] Live regions for recognition output (`aria-live="polite"`)

---

## 10. File structure (frontend)

```
app/
  layout.tsx          # fonts, providers, skip link
  page.tsx            # landing
  globals.css         # design tokens + utilities
components/
  ui/                 # Button, Card, Container, SectionHeading
  marketing/          # MarketingNav, MarketingFooter
  layout/             # DashboardLayout
  Logo.tsx
lib/
  theme-context.tsx
docs/
  DESIGN-SYSTEM.md    # this file
```

---

## 11. Implementation status

- [x] Design tokens in `globals.css`
- [x] IBM Plex Sans in `layout.tsx`
- [x] UI primitives in `components/ui/`
- [x] Marketing landing redesign
- [x] Dashboard pages token migration + live API data
- [x] Sign studio — DashboardLayout, institutional styling, API save
- [x] Learn flow — API-backed units, exercises, leaderboard
- [x] Profile — high-contrast, large text, reduce motion, theme + language sync
- [x] Admin — institutional styling, users table, system health from API
- [x] Auth hydration on app load (`AuthHydrator`)
- [x] Accessibility prefs persisted to `localStorage`

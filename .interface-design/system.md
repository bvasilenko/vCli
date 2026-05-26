# Design System

## Color Palette
Source: `@booga/vtheme/preset` via Tailwind — OKLCH-based custom properties, exposed as `--v-color-*` and consumed via Tailwind utility classes.

| Token | CSS variable | Tailwind class |
|---|---|---|
| background | `--v-color-background: 98% .005 240` | `bg-background`, `text-background` |
| foreground | `--v-color-foreground: 12% .01 240` | `text-foreground` |
| card | `--v-color-card: 100% 0 0` | `bg-card` |
| card-foreground | `--v-color-card-foreground: 12% .01 240` | `text-card-foreground` |
| primary | `--v-color-primary: 55% .2 250` | `bg-primary`, `text-primary` |
| primary-foreground | `--v-color-primary-foreground: 99% .005 250` | `text-primary-foreground` |
| secondary | `--v-color-secondary: 95% .01 240` | `bg-secondary` |
| secondary-foreground | `--v-color-secondary-foreground: 20% .02 240` | `text-secondary-foreground` |
| muted | `--v-color-muted: 95% .008 240` | `bg-muted` |
| muted-foreground | `--v-color-muted-foreground: 55% .015 240` | `text-muted-foreground` |
| accent | `--v-color-accent: 95% .01 240` | `bg-accent` |
| accent-foreground | `--v-color-accent-foreground: 20% .02 240` | `text-accent-foreground` |
| destructive | `--v-color-destructive: 55% .22 27` | `bg-destructive`, `text-destructive` |
| destructive-foreground | `--v-color-destructive-foreground: 99% .005 27` | `text-destructive-foreground` |
| success | `--v-color-success: 55% .18 145` | `bg-success`, `text-success` |
| warning | `--v-color-warning: 70% .18 65` | `bg-warning`, `text-warning` |
| border | `--v-color-border: 90% .008 240` | `border-input`, `bg-border` |
| input | `--v-color-input: 90% .008 240` | `border-input` |
| ring | `--v-color-ring: 55% .2 250` | `focus:ring-ring`, `focus-visible:ring-ring` |

## Spacing Scale
Base unit: 4px (Tailwind default)
Scale (rem): 0.25 / 0.5 / 0.75 / 1 / 1.5 / 2 / 3 / 4 / 5 / 6 / 8
Classes: `p-1` (4px) → `p-2` (8px) → `p-3` (12px) → `p-4` (16px) → `p-6` (24px) → `p-8` (32px) → `p-12` (48px) → `p-16` (64px) → `p-24` (96px)
Section padding: `py-20` (80px) used for section vertical rhythm

## Typography
Size scale with integrated line-height and weight:
| Class | Size | Line height | Weight |
|---|---|---|---|
| `text-xs` | 0.75rem | 1.6 | 400 |
| `text-sm` | 0.875rem | 1.55 | 400 |
| `text-base` | 1rem | 1.5 | 400 |
| `text-lg` | 1.125rem | 1.45 | 500 |
| `text-xl` | 1.25rem | 1.4 | 600 |
| `text-2xl` | 1.5rem | 1.35 | 600 |
| `text-3xl` | 1.875rem | 1.3 | 700 |
| `text-4xl` | 2.25rem | 1.2 | 700 |
| `text-5xl` | 3rem | 1.1 | 800 |

Modifiers: `font-medium` (500), `font-semibold` (600), `font-bold` (700)
Labels: `uppercase tracking-widest` (letter-spacing: 0.1em)
Tight headings: `tracking-tight` (-0.025em)

## Depth Strategy
Subtle shadows — three levels:
- `shadow-sm`: `0 1px 2px 0 rgb(0 0 0 / .05)` — slight lift
- `shadow-md`: `0 4px 6px -1px rgb(0 0 0 / .1), 0 2px 4px -2px rgb(0 0 0 / .1)` — card elevation
- `shadow-lg`: `0 10px 15px -3px rgb(0 0 0 / .1), 0 4px 6px -4px rgb(0 0 0 / .1)` — floating elements

## Component Patterns
- **Root wrapper**: `bg-background text-foreground` (apply to page root)
- **Cards**: `bg-card` surface with `text-card-foreground`
- **Buttons**: primary=`bg-primary hover:bg-primary/90`, secondary=`bg-secondary hover:bg-secondary/80`, destructive=`bg-destructive hover:bg-destructive/90`
- **Focus ring**: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background`
- **Disabled**: `disabled:pointer-events-none disabled:opacity-50`
- **Responsive grid**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- **Max widths**: `max-w-lg` (32rem), `max-w-2xl` (42rem), `max-w-3xl` (48rem), `max-w-6xl` (72rem)
- **Transitions**: `transition-colors` for color changes, `transition-transform` for motion

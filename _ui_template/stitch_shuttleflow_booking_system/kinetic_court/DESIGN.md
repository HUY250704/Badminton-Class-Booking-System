---
name: Kinetic Court
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#424936'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#727a64'
  outline-variant: '#c2cab0'
  surface-tint: '#446900'
  primary: '#446900'
  on-primary: '#ffffff'
  primary-container: '#a3e635'
  on-primary-container: '#416400'
  inverse-primary: '#98da27'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#505f76'
  on-tertiary: '#ffffff'
  tertiary-container: '#c3d4ee'
  on-tertiary-container: '#4c5c72'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b2f746'
  primary-fixed-dim: '#98da27'
  on-primary-fixed: '#121f00'
  on-primary-fixed-variant: '#334f00'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#d3e4fe'
  tertiary-fixed-dim: '#b7c8e1'
  on-tertiary-fixed: '#0b1c30'
  on-tertiary-fixed-variant: '#38485d'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-padding: 24px
  gutter: 16px
  section-gap: 48px
---

## Brand & Style

The design system is engineered for a high-energy, performance-driven badminton booking experience. It targets active players who value efficiency, precision, and a modern sporting lifestyle. The aesthetic combines **Minimalism** with **High-Contrast** accents to evoke the fast-paced nature of the sport. 

The visual language is characterized by "Electric Precision"—utilizing a vibrant primary color against a sophisticated, neutral backdrop to ensure critical actions are unmistakable. The interface should feel breathable and fast, minimizing friction between the user and the court.

## Colors

The palette centers on **Neon Lime Green**, a color that symbolizes energy and visibility on the court. This is paired with **Deep Slate** (Charcoal) for high-impact typography and structural elements.

- **Primary**: Neon Lime Green (#A3E635). Used for primary calls-to-action, active states, and success indicators.
- **Secondary**: Deep Slate (#0F172A). Used for headers, primary text, and high-contrast buttons to provide a grounded, professional feel.
- **Surface**: The background remains a crisp, clean White (#FFFFFF) or very light Neutral (#F8FAFC) to ensure the Neon accents pop without causing visual fatigue.
- **Accents**: Subtle Slate grays are used for borders and secondary information to maintain a technical, athletic look.

## Typography

This design system utilizes **Inter** exclusively to maintain a systematic, utilitarian, and modern athletic feel. 

- **Headlines**: Use heavy weights (Bold/ExtraBold) with slight negative letter-spacing to create a sense of impact and urgency.
- **Labels**: Small caps or uppercase treatments are encouraged for technical data points (e.g., "COURT 4", "10:00 AM") to mimic scoreboard styling.
- **Body**: Maintained at a clean 16px for optimal readability during quick navigation.

## Layout & Spacing

The layout follows a **Fluid Grid** model with generous safe areas to ensure ease of use on mobile devices while at the sports complex.

- **Grid**: 12-column grid for desktop, 4-column for mobile.
- **Rhythm**: An 8px base unit governs all dimensions. Use 16px (2 units) for internal component padding and 24px (3 units) for page margins.
- **Responsive Behavior**: Cards should stack vertically on mobile, but maintain horizontal scrolling for "Time Slot" pickers to keep the interface compact.

## Elevation & Depth

To maintain a "fast" and modern feel, depth is created through **Ambient Shadows** and tonal layering rather than heavy gradients.

- **Low Elevation**: Standard cards use a very soft, diffused shadow (0px 4px 20px rgba(15, 23, 42, 0.05)) to lift them slightly from the neutral background.
- **High Elevation**: Active states or modals use a more pronounced shadow with a slight charcoal tint to focus user attention.
- **Interactive Surfaces**: Use subtle 1px borders in Light Gray (#E2E8F0) to define boundaries without adding visual weight.

## Shapes

The design system utilizes a **Rounded** philosophy, specifically leaning into `rounded-2xl` for containers to soften the aggressive high-contrast colors and create an approachable, premium feel.

- **Primary Containers**: 1rem (16px) corner radius for main cards.
- **Interactive Elements**: Buttons and inputs use a slightly smaller radius (12px) for a tighter, more functional appearance.
- **Badges**: Fully pill-shaped (rounded-full) to distinguish them from functional UI buttons.

## Components

### Buttons
- **Primary Action**: Deep Slate background with Neon Lime text (or vice-versa for high emphasis). High contrast is mandatory.
- **Secondary Action**: White background with a 1px Slate border.

### Sports-Themed Badges
- **Skill Levels**:
    - *Beginner*: Light Slate background with Dark Slate text.
    - *Intermediate*: Soft Blue background.
    - *Advanced*: Neon Lime Green background with Black text.
- Badges use `label-sm` typography and a pill shape.

### Capacity Progress Bars
- High-contrast bars using a "track" of Light Gray and a "fill" of Neon Lime Green. For classes near capacity (>90%), the fill color should shift to a cautionary Orange or remain Neon Lime for brand consistency but add a "Last few spots" label.

### Booking Cards
- Large, `rounded-2xl` surfaces. Headline for the coach/class name, followed by a clear horizontal list of available times. Use the ambient shadow defined in Elevation & Depth.

### Input Fields
- Clean, 1px bordered boxes that highlight with a Neon Lime Green stroke when focused. Place labels strictly above the field using `label-md`.
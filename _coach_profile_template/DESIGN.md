---
name: ProCourt Athletics
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
  on-surface-variant: '#444651'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#757682'
  outline-variant: '#c5c5d3'
  surface-tint: '#4059aa'
  primary: '#00236f'
  on-primary: '#ffffff'
  primary-container: '#1e3a8a'
  on-primary-container: '#90a8ff'
  inverse-primary: '#b6c4ff'
  secondary: '#9d4300'
  on-secondary: '#ffffff'
  secondary-container: '#fd761a'
  on-secondary-container: '#5c2400'
  tertiary: '#1b2b3f'
  on-tertiary: '#ffffff'
  tertiary-container: '#314156'
  on-tertiary-container: '#9dadc6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#00164e'
  on-primary-fixed-variant: '#264191'
  secondary-fixed: '#ffdbca'
  secondary-fixed-dim: '#ffb690'
  on-secondary-fixed: '#341100'
  on-secondary-fixed-variant: '#783200'
  tertiary-fixed: '#d3e4fe'
  tertiary-fixed-dim: '#b7c8e1'
  on-tertiary-fixed: '#0b1c30'
  on-tertiary-fixed-variant: '#38485d'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '800'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  stats-number:
    fontFamily: Montserrat
    fontSize: 36px
    fontWeight: '800'
    lineHeight: '1.0'
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.0'
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

The design system is engineered for the high-performance world of professional sports coaching. It prioritizes a sense of "Kinetic Professionalism"—balancing the high-energy, fast-paced nature of badminton with the structural authority required of a world-class coach. The target audience includes aspiring athletes, professional players, and sports organizations seeking elite instruction.

The visual style is **Corporate / Modern** with a **High-Contrast** edge. It utilizes expansive whitespace to ensure clarity of information, punctuated by aggressive splashes of highlight color to guide the eye toward conversion points and key performance indicators. The emotional response is intended to be one of immediate trust, athletic vigor, and disciplined excellence.

## Colors

The palette is anchored by **Deep Championship Navy** (#1e3a8a), evoking stability and institutional trust. This is offset by **Shuttlecock Orange** (#f97316), a high-visibility accent used exclusively for call-to-actions, notifications, and critical highlights to maintain an energetic pulse throughout the interface.

A range of cool-toned grays (derived from #64748b) provides the necessary hierarchy for secondary information and metadata. The background utilizes a crisp, clean white to maximize readability, while subtle light gray surfaces (#f1f5f9) are used to differentiate content modules without adding visual clutter.

## Typography

This design system employs a dual-font strategy to balance impact with legibility. **Montserrat** is used for all display and headline roles; its geometric construction and heavy weights provide a modern, "stadium" feel that communicates power.

**Inter** is utilized for all body copy, UI labels, and data points. Its high x-height and neutral character ensure that dense coaching programs and technical bios remain highly readable across all devices. Large numerical data (coaching stats) should use the `stats-number` style to emphasize track-record success.

## Layout & Spacing

The system follows a **Fluid Grid** model with a 12-column structure for desktop and a 4-column structure for mobile. A strict 8px base unit governs all spatial relationships to maintain rhythmic consistency.

Margins and gutters are generous to prevent the UI from feeling "crowded," reflecting the open space of a badminton court. Content should reflow vertically on mobile devices, with horizontal scrolling reserved exclusively for secondary "badges" or "certification" carousels to preserve the primary vertical narrative of the coach's profile.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and **Ambient Shadows**. Instead of heavy borders, the design uses soft, diffused shadows with a slight navy tint (`rgba(30, 58, 138, 0.08)`) to lift cards off the background. 

Primary interaction elements (like "Book a Session" buttons) use a more pronounced shadow to indicate clickability. Subtle 1px borders in a very light gray are used for interior card divisions to maintain a crisp, professional edge without adding unnecessary weight.

## Shapes

The shape language is **Soft** (Level 1). This choice provides a modern, approachable feel while maintaining enough sharpness to feel precise and technical. 

- **Standard Elements:** 0.25rem (4px) corner radius for small inputs and buttons.
- **Content Cards:** 0.5rem (8px) for a more substantial, framed appearance.
- **Badges/Chips:** 100px (fully rounded) to contrast against the structured grid and highlight certifications.

## Components

### Buttons
Primary buttons use the energetic navy background with white text. Hover states shift the background to a slightly lighter tint. The "Action" button (e.g., Book Now) uses the vibrant orange to stand out from the rest of the interface.

### Cards
Coaching profile segments (Experience, Techniques, Testimonials) are housed in cards with a white background, 8px corner radius, and a subtle ambient shadow. Headlines within cards are always set in Montserrat Bold.

### Sporty Badges
Certifications and specializations use "Pill-shaped" chips. These should have a light-gray background with dark navy text, or a light navy background with primary navy text to denote different levels of expertise.

### Stats Display
Coaching metrics (e.g., "15+ Years Experience," "500+ Students") should be grouped in a high-visibility horizontal bar using the `stats-number` typography, often placed directly below the hero section.

### Input Fields
Forms use a 1px border (#cbd5e1) that transitions to the primary navy blue on focus. Use Inter for all input text to ensure clarity during the booking process.
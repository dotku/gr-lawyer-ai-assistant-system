# OrdoLex Logo

Minimalist logo design inspired by the orbits aesthetic, featuring balanced circles representing the scales of justice.

## Design Concept
- **Ordo** (Latin: order) + **Lex** (Latin: law)
- Geometric circles symbolizing balance and justice
- Clean, professional aesthetic with navy blue (#003366) and white
- Spaced lowercase typography

## Usage

### React Component

```tsx
import { Logo } from '@/components/Logo';

// Full logo with text
<Logo />

// Icon only (square format)
<Logo variant="icon" />

// Custom size
<Logo width={120} height={140} />

// With custom className
<Logo className="my-custom-class" />
```

### Static SVG Files

Located in `/public/`:

- `ordolex-logo.svg` - Full logo with text (240x280)
- `ordolex-icon.svg` - Icon only, square format (240x240)
- `ordolex-wordmark.svg` - Horizontal wordmark with icon (400x80)

Use in Next.js:
```tsx
import Image from 'next/image';

<Image
  src="/ordolex-logo.svg"
  alt="OrdoLex"
  width={240}
  height={280}
/>
```

## Color Palette

- **Primary Blue**: `#003366` (Navy)
- **White**: `#FFFFFF`

## Variants

- **full**: Complete logo with geometric icon and text
- **icon**: Icon only (perfect for favicons, app icons)
- **wordmark**: Horizontal layout for headers and navigation

# Antigravity Design System

## Overview
Antigravity is a unified design system for Kezdes, providing consistent UI components and design tokens across web (React) and mobile (React Native) platforms.

## Platform Support
- **Web**: `web_crm` (React + Tailwind CSS)
- **Mobile**: `mobile-rn` (React Native)

## Design Tokens

### Colors
- **Primary (CRM Admin)**: Zoho-like blue/indigo palette
- **Accent (Client/Public)**: Brand green palette
- **Semantic**: Success (green), Warning (amber), Error (red), Neutral (gray)

### Typography
- Font: Inter (system-ui fallback)
- Sizes: 4px-based scale (xs → 9xl)
- Weights: 100–900

### Spacing
- 4px grid system (4px → 384px)

### Radii & Shadows
- Consistent border radius scale
- Subtle elevation shadows

## Components

### Web (Storybook)
Run `npm run storybook` in `web_crm` to view components:
- Button (variants: primary, secondary, danger, ghost; sizes: sm, md, lg)
- Input (label, error, helper, icons)
- Badge (semantic colors)
- Card (Header, Title, Description, Content, Footer)

### Mobile (React Native)
Components in `mobile-rn/components/ui/`:
- Button (same variants/sizes as web)
- Uses `useTheme` hook for token access

## Usage

### Web
```tsx
import { Button, Badge, Card } from '@/components/ui';

<Button variant="primary" size="md">Save</Button>
<Badge variant="success">Active</Badge>
<Card>Content</Card>
```

### Mobile
```tsx
import { Button } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';

const theme = useTheme();
<Button variant="primary">Save</Button>
```

## Theme Separation
- **CRM Admin (/.app/*)**: `theme-crm` class → blue primary
- **Client/Public (/.public/*, /.guest/*)**: default → green accent

## Development

### Adding New Components
1. Create component in `src/components/ui/` (web) or `mobile-rn/components/ui/` (RN)
2. Add Storybook stories for web
3. Export from `index.ts`
4. Use tokens from `tokens/` or `theme/`

### Updating Tokens
- Web: Edit files in `web_crm/src/tokens/`
- Mobile: Edit files in `mobile-rn/theme/`

## Designer Guidelines

### Figma Setup
1. Create color styles matching tokens
2. Use 4px spacing grid
3. Define component variants (Button states, etc.)
4. Export tokens as CSS variables or JSON

### Naming Conventions
- Colors: `primary-600`, `accent-500`, `error-600`
- Spacing: `spacing-4` (16px), `spacing-8` (32px)
- Typography: `text-sm`, `font-medium`

## Storybook
- URL: http://localhost:6006
- Autodocs enabled
- Controls for props

## Migration Notes
- Existing components updated to use tokens
- Tailwind config now imports tokens
- Theme classes applied via CSS variables

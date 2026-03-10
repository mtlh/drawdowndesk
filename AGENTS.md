# AGENTS.md

This file provides guidance for AI coding agents operating in this repository.

## Project Overview

DrawdownDesk is a personal finance/portfolio management application using Next.js 15, Convex (backend), React 19, TypeScript, and Tailwind CSS 4. It includes UK tax calculations, Monte Carlo simulations, and can be packaged as an Electron desktop app.

## Commands

```bash
# Development
npm run dev              # Start dev server with Turbopack (http://localhost:3000)
npm run dev:clean        # Clean .next and start fresh dev server
npm run start            # Start production server

# Building
npm run build            # Build Next.js app (WARNING: breaks local dev server)
npm run lint             # Run ESLint + TypeScript type checking

# Type checking only
npx tsc --noEmit        # Check TypeScript without building

# Convex
npx convex dev          # Start Convex dev server and regenerate API types after schema changes

# Electron desktop app
npm run electron:dev    # Run Electron with local dev server
npm run electron:start # Run Electron locally (requires dev server running)
npm run electron:build # Build desktop app to release/DrawdownDesk-win32-x64/
```

## Architecture

### Directory Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes (e.g., updateTickers)
│   ├── holdings/          # Holdings management
│   ├── cashflow-calculator/
│   ├── monte-carlo-simulator/
│   └── *.tsx            # Page components
├── components/
│   ├── ui/               # Reusable Radix-based components (shadcn/ui style)
│   └── customTreeMap/    # Visualization components
├── lib/                  # Utility functions and calculations
├── hooks/                # Custom React hooks
└── types/                # TypeScript type definitions

convex/                   # Convex backend
├── schema.ts            # Database schema
├── portfolio/           # Portfolio CRUD
├── calculators/        # Monte Carlo, tax calculations
├── tax/                # UK tax band queries
└── auth.ts             # Authentication
```

### Tech Stack

- **Framework:** Next.js 15.4 (App Router, Turbopack)
- **Backend:** Convex (serverless, real-time sync)
- **UI:** React 19, TypeScript, Tailwind CSS 4
- **Components:** Radix UI primitives
- **Charts:** Recharts
- **Auth:** @convex-dev/auth with Google OAuth
- **Desktop:** Electron

## Code Style Guidelines

### TypeScript

- **Never use `any`** - Replace with proper types. If needed, use `unknown` with proper type guards.
- Use **explicit return types** for utility functions and complex calculations.
- Use **discriminated unions** for error handling instead of type casting:

```typescript
// Good
interface Success { data: string; }
interface Error { error: string; }
type Result = Success | Error;

// Bad - avoid type casting
const result = something as { incomeTax: number };
```

### Naming Conventions

- **Components:** PascalCase (e.g., `PortfolioHoldingsPage`)
- **Functions/variables:** camelCase (e.g., `getPriceInPounds`, `isAuthenticated`)
- **Types/interfaces:** PascalCase (e.g., `TaxRates`, `Holding`)
- **Constants:** camelCase for values, UPPER_SNAKE for config objects (e.g., `EXCHANGE_SUFFIXES`)
- **Files:** kebab-case for pages (e.g., `cashflow-calculator/page.tsx`), PascalCase for components

### Imports

- Use **path aliases** (`@/` for src root):

```typescript
import { Button } from "@/components/ui/button";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
```

- **Order imports:** React imports → external libs → internal components/hooks → utils/types
- Group imports with comments for large files:

```typescript
// React
import { useState, useMemo } from "react";

// Components
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// Convex
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

// Utils
import { getPriceInPounds } from "@/lib/utils";
```

### React Patterns

- Use **client components** with `"use client"` directive for interactivity
- Use `useMemo` for expensive calculations, `useCallback` for passed functions
- Use `useRef` with `initialized` flag to prevent double initialization in `useEffect`
- Wrap `useQuery` calls in helper functions to avoid deep type inference issues:

```typescript
function useCurrentUserQuery(): CurrentUserResult | undefined {
  return useQuery(api.currentUser.getCurrentUser.getCurrentUser);
}
```

### Error Handling

- Return **error objects** (not thrown errors) in Convex queries for graceful degradation:

```typescript
if (!data) return { error: "Data not found" };
return { data, error: undefined };
```

- Display user-friendly errors in UI with proper error boundaries
- Log errors appropriately (avoid `console.log`, use `console.error` for actual errors)

### Convex Backend

- **Always validate user ownership** in mutations before modifying data
- Use **appropriate indexes** in schema for query performance
- After modifying schema or convex functions, run `npx convex dev` to regenerate types
- Use `v.*` validators from `convex/values` for args validation

### Database Schema (convex/schema.ts)

- Use `v.id()` for foreign keys
- Define indexes for common query patterns
- Add `lastUpdated` field to track modifications

### Tailwind CSS

- Use Tailwind CSS 4 syntax with `@theme` for custom values
- Use **semantic color tokens** (e.g., `text-primary`, `bg-secondary`)
- Use `hsl(var(--chart-1))` for chart colors defined in CSS
- Use `dark:` prefix for dark mode variants
- Keep dark mode as default

### Security

- Never commit secrets/API keys to version control
- Use environment variables (`.env.local`) for sensitive data
- Validate and sanitize all user inputs
- Add authentication checks to API routes

### Testing

- Test complex calculation logic (tax, Monte Carlo) thoroughly
- Use TypeScript types as a form of documentation
- Verify changes with `npm run lint` before committing

### Version Updates

When releasing new versions, update both:
- `src/lib/app-config.ts` - web app version
- `electron/version.ts` - Electron version

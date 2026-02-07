# Test Infrastructure for DIA Live

## Current State

**No test infrastructure exists.** The project does not have:

- Vitest or Jest installed
- Test configuration files
- Any existing test files

## Recommended Setup

### 1. Install Dependencies

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom
```

### 2. Create Vitest Configuration

Create `vitest.config.ts` in project root:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'html'],
      exclude: ['convex/_generated/**', 'node_modules/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/convex': path.resolve(__dirname, './convex'),
    },
  },
});
```

### 3. Create Test Setup File

Create `src/test/setup.ts`:

```typescript
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Convex hooks globally
vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
  useAction: vi.fn(() => vi.fn()),
  ConvexProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));
```

### 4. Add Test Scripts to package.json

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

### 5. TypeScript Configuration

Add to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  }
}
```

---

## Testing Patterns for DIA Live

### Mocking Convex Queries

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useQuery } from 'convex/react';

// Cast to mock for type safety
const mockUseQuery = useQuery as ReturnType<typeof vi.fn>;

describe('CoachLoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows error for invalid PIN', async () => {
    mockUseQuery.mockReturnValue(null); // Invalid PIN returns null
    
    render(<CoachLoginPage />);
    // ... test assertions
  });

  it('shows dashboard for valid PIN', async () => {
    mockUseQuery.mockReturnValue({
      coach: { id: '123', name: 'Coach Mike' },
      teams: [{ id: '456', name: 'JO12-1' }],
      matches: [],
    });
    
    render(<CoachLoginPage />);
    expect(screen.getByText('Welkom, Coach Mike')).toBeInTheDocument();
  });
});
```

### Mocking Convex Mutations

```typescript
import { vi } from 'vitest';
import { useMutation } from 'convex/react';

const mockUseMutation = useMutation as ReturnType<typeof vi.fn>;
const mockMutate = vi.fn();

beforeEach(() => {
  mockUseMutation.mockReturnValue(mockMutate);
});

it('calls mutation on form submit', async () => {
  render(<CreateMatchPage />);
  
  // Fill form and submit
  await userEvent.click(screen.getByRole('button', { name: 'Aanmaken' }));
  
  expect(mockMutate).toHaveBeenCalledWith({
    teamId: expect.any(String),
    opponent: 'VV Oranje',
    // ...
  });
});
```

### Testing Dutch UI Text

Always assert Dutch text, not English:

```typescript
// Good - Dutch assertions
expect(screen.getByText('Ongeldige PIN code')).toBeInTheDocument();
expect(screen.getByRole('button', { name: 'Inloggen' })).toBeEnabled();
expect(screen.getByText('Gepland')).toBeInTheDocument();
expect(screen.getByText('Afgelopen')).toBeInTheDocument();

// Bad - English assertions (wrong for this app)
expect(screen.getByText('Invalid PIN')).toBeInTheDocument(); // ❌
```

---

## Convex Function Testing

Convex functions (queries, mutations, actions) run on the server and require special testing approaches.

### Option 1: Integration Tests with Test Database

Use a separate Convex project for testing:

```bash
# Create test deployment
npx convex deploy --project dia-live-test
```

### Option 2: Unit Tests with Mocked Context

```typescript
// convex/seed.test.ts
import { describe, it, expect, vi } from 'vitest';

// Note: This requires mocking the Convex context
// which is complex. Prefer integration tests for Convex functions.

describe('generatePlayers', () => {
  it('generates 14 unique players', () => {
    const usedNames = new Set<string>();
    const players = generatePlayers(usedNames);
    
    expect(players).toHaveLength(14);
    expect(new Set(players.map(p => p.name)).size).toBe(14); // All unique
  });
});
```

### Option 3: Convex Test Framework (Recommended)

Convex provides a testing framework for server-side functions:

```typescript
// convex/seed.test.ts
import { convexTest } from 'convex-test';
import { api } from './_generated/api';
import schema from './schema';

describe('seed:init', () => {
  it('creates DIA club and teams', async () => {
    const t = convexTest(schema);
    
    const result = await t.action(api.seed.init);
    
    expect(result.created).toBe(true);
    expect(result.data?.teams).toHaveLength(3);
  });

  it('is idempotent', async () => {
    const t = convexTest(schema);
    
    await t.action(api.seed.init);
    const result = await t.action(api.seed.init);
    
    expect(result.created).toBe(false);
  });
});
```

Install with:

```bash
npm install -D convex-test
```

---

## Priority Test Files to Create

Once infrastructure is set up, create these tests in order:

1. **`src/app/coach/page.test.tsx`** - Coach PIN login
   - Valid PIN shows dashboard
   - Invalid PIN shows "Ongeldige PIN code"
   - Short PIN disables button

2. **`src/app/live/[code]/page.test.tsx`** - Public match view
   - Valid code shows match
   - Invalid code shows error
   - Status badges render correctly

3. **`convex/seed.test.ts`** - Seed script (with convex-test)
   - Creates all expected data
   - Idempotency works

4. **`convex/matches.test.ts`** - Query functions
   - `verifyCoachPin` returns null for invalid PIN
   - `getByPublicCode` returns match data

---

## Estimated Setup Time

| Task | Complexity |
|------|------------|
| Install dependencies | 5 min |
| Create config files | 10 min |
| First component test | 20 min |
| Convex test setup | 30 min |

**Total:** ~1 hour for basic setup with one working test.

---

## Next Steps

1. Run: `npm install -D vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom`
2. Create `vitest.config.ts` (copy from above)
3. Create `src/test/setup.ts` (copy from above)
4. Add test scripts to `package.json`
5. Create first test: `src/app/coach/page.test.tsx`
6. Run: `npm test`

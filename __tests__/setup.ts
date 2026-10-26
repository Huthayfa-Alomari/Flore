import { expect, vi } from 'vitest'

import * as matchers from '@testing-library/jest-dom/matchers'

// 1. تمديد قدرات الفحص لـ Vitest
expect.extend(matchers)

// 2. حقن دوال الفحص مباشرة داخل موديول Vitest
declare module 'vitest' {
  interface Assertion<T = any> {
    toBeInTheDocument(): void
    toBeVisible(): void
    toBeDisabled(): void
    toHaveClass(...classNames: string[]): void
    toHaveAttribute(attr: string, value?: any): void
    toHaveTextContent(text: string | RegExp): void
    toHaveValue(value: any): void
  }
  interface AsymmetricMatchersContaining {
    toBeInTheDocument(): void
    toBeVisible(): void
    toBeDisabled(): void
    toHaveClass(...classNames: string[]): void
    toHaveAttribute(attr: string, value?: any): void
    toHaveTextContent(text: string | RegExp): void
    toHaveValue(value: any): void
  }
}

// 3. محاكاة matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => { },
    removeListener: () => { },
    addEventListener: () => { },
    removeEventListener: () => { },
    dispatchEvent: () => true,
  }),
})

// 4. Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// 5. Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null } })),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ subscription: { unsubscribe: vi.fn() } })),
    },
    from: vi.fn(function() {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      }
    }),
  }),
}))

// 6. Mock ResizeObserver
class ResizeObserverMock {
  observe() { }
  unobserve() { }
  disconnect() { }
}
global.ResizeObserver = ResizeObserverMock

// 6.1 Mock IntersectionObserver (يحتاجه framer-motion لخاصية whileInView)
class IntersectionObserverMock {
  readonly root: Element | null = null
  readonly rootMargin: string = ''
  readonly thresholds: ReadonlyArray<number> = []
  observe() { }
  unobserve() { }
  disconnect() { }
  takeRecords(): IntersectionObserverEntry[] { return [] }
}
global.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver

// 7. Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}))

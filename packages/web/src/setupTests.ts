import '@testing-library/jest-dom/vitest'

// jsdom's window.localStorage needs Node's --localstorage-file flag under
// recent Node versions; stub a simple in-memory implementation for tests.
if (typeof window !== 'undefined' && !window.localStorage) {
  const store = new Map<string, string>()
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
    },
    configurable: true,
  })
}

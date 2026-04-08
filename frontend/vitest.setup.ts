import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, vi } from 'vitest';
import React from 'react';

// Mock react-syntax-highlighter to avoid ES module issues
vi.mock('react-syntax-highlighter', () => ({
  Prism: (props: { children: React.ReactNode; [key: string]: unknown }) => {
    const { children, ...other } = props;
    return React.createElement('code', { 'data-testid': 'syntax-highlighted-code', ...other }, children);
  },
}));

vi.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  vscDarkPlus: {},
}));

beforeAll(() => {
  vi.spyOn(console, 'error').mockImplementation(vi.fn());
  window.URL.createObjectURL = (file: File) => file.name;

  const patchStorage = (storageName: 'localStorage' | 'sessionStorage') => {
    const targetStorage = window[storageName];
    if (typeof targetStorage?.getItem === 'function') {
      return;
    }

    const memoryStorage = new Map<string, string>();
    Object.defineProperty(window, storageName, {
      value: {
        get length() {
          return memoryStorage.size;
        },
        key: (index: number) => Array.from(memoryStorage.keys())[index] ?? null,
        getItem: (key: string) => memoryStorage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          memoryStorage.set(key, String(value));
        },
        removeItem: (key: string) => {
          memoryStorage.delete(key);
        },
        clear: () => {
          memoryStorage.clear();
        },
      } satisfies Storage,
      configurable: true,
    });
  };

  patchStorage('localStorage');
  patchStorage('sessionStorage');

  // Mantine needed mocks
  // see: https://mantine.dev/guides/vitest/
  const { getComputedStyle } = window;
  window.getComputedStyle = (elt) => getComputedStyle(elt);
  window.HTMLElement.prototype.scrollIntoView = () => {};

  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });

  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  window.ResizeObserver = ResizeObserver;
});

afterEach(() => {
  cleanup();
});

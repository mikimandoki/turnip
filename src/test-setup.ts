import '@testing-library/jest-dom';

// Radix UI Switch uses ResizeObserver internally
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

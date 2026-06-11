import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement matchMedia — stub it for components that read it (cursor, typewriter).
window.matchMedia = window.matchMedia || ((query: string) => ({
  matches: false, media: query, onchange: null,
  addListener: () => {}, removeListener: () => {},
  addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
})) as any;

// ResizeObserver is used by the ECharts wrapper.
(globalThis as any).ResizeObserver = (globalThis as any).ResizeObserver || class {
  observe() {} unobserve() {} disconnect() {}
};

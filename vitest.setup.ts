import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Bersihkan DOM antar tes.
afterEach(() => {
  cleanup();
});

// jsdom tidak menyediakan matchMedia / scrollTo — tambahkan stub minimal
// agar komponen yang memakainya bisa dirender.
if (typeof window !== "undefined") {
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }
  if (!window.scrollTo) {
    window.scrollTo = (() => {}) as unknown as typeof window.scrollTo;
  }
}

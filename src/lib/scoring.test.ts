import { describe, it, expect, vi, afterEach } from "vitest";
import { speedBonus } from "./scoring";

describe("speedBonus", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("memberi bonus penuh bila dijawab seketika", () => {
    vi.useFakeTimers();
    const t0 = Date.now();
    expect(speedBonus(t0, 5, 3000)).toBe(5);
  });

  it("memberi 0 bila melewati jendela waktu", () => {
    vi.useFakeTimers();
    const t0 = Date.now();
    vi.advanceTimersByTime(3000);
    expect(speedBonus(t0, 5, 3000)).toBe(0);

    vi.advanceTimersByTime(5000);
    expect(speedBonus(t0, 5, 3000)).toBe(0);
  });

  it("menurun secara linear di tengah jendela", () => {
    vi.useFakeTimers();
    const t0 = Date.now();
    vi.advanceTimersByTime(1500); // tepat setengah dari 3000ms
    expect(speedBonus(t0, 8, 3000)).toBe(4);
  });

  it("tidak pernah negatif", () => {
    vi.useFakeTimers();
    const t0 = Date.now();
    vi.advanceTimersByTime(100000);
    expect(speedBonus(t0, 5, 3000)).toBeGreaterThanOrEqual(0);
  });

  it("memakai nilai default max=5 dan window=3000ms", () => {
    vi.useFakeTimers();
    const t0 = Date.now();
    expect(speedBonus(t0)).toBe(5);
  });
});

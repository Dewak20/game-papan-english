import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { fireEvent } from "@testing-library/dom";
import { useKeyboardChoices, BUZZER_KEYS } from "./useKeyboardChoices";

describe("useKeyboardChoices", () => {
  it("memetakan tombol BLUE (1-4) ke pilihan 0-3", () => {
    const onChoice = vi.fn();
    renderHook(() => useKeyboardChoices({ enabled: true, solo: false, onChoice }));

    fireEvent.keyDown(window, { key: "1" });
    fireEvent.keyDown(window, { key: "4" });
    expect(onChoice).toHaveBeenNthCalledWith(1, "blue", 0);
    expect(onChoice).toHaveBeenNthCalledWith(2, "blue", 3);
  });

  it("memetakan tombol RED (7 8 9 0) ke pilihan 0-3", () => {
    const onChoice = vi.fn();
    renderHook(() => useKeyboardChoices({ enabled: true, solo: false, onChoice }));

    fireEvent.keyDown(window, { key: "7" });
    fireEvent.keyDown(window, { key: "0" });
    expect(onChoice).toHaveBeenNthCalledWith(1, "red", 0);
    expect(onChoice).toHaveBeenNthCalledWith(2, "red", 3);
  });

  it("mengabaikan tombol RED saat mode solo", () => {
    const onChoice = vi.fn();
    renderHook(() => useKeyboardChoices({ enabled: true, solo: true, onChoice }));

    fireEvent.keyDown(window, { key: "7" });
    expect(onChoice).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "2" });
    expect(onChoice).toHaveBeenCalledWith("blue", 1);
  });

  it("tidak menangkap tombol saat nonaktif", () => {
    const onChoice = vi.fn();
    renderHook(() => useKeyboardChoices({ enabled: false, solo: false, onChoice }));
    fireEvent.keyDown(window, { key: "1" });
    expect(onChoice).not.toHaveBeenCalled();
  });

  it("mengabaikan key repeat & tombol modifier", () => {
    const onChoice = vi.fn();
    renderHook(() => useKeyboardChoices({ enabled: true, solo: false, onChoice }));

    fireEvent.keyDown(window, { key: "1", repeat: true });
    fireEvent.keyDown(window, { key: "2", ctrlKey: true });
    expect(onChoice).not.toHaveBeenCalled();
  });

  it("menghormati optionCount (mis. hanya 2 pilihan)", () => {
    const onChoice = vi.fn();
    renderHook(() =>
      useKeyboardChoices({ enabled: true, solo: false, onChoice, optionCount: 2 }),
    );
    fireEvent.keyDown(window, { key: "2" });
    fireEvent.keyDown(window, { key: "3" });
    expect(onChoice).toHaveBeenCalledTimes(1);
    expect(onChoice).toHaveBeenCalledWith("blue", 1);
  });

  it("BUZZER_KEYS mendefinisikan 4 tombol per tim", () => {
    expect(BUZZER_KEYS.blue).toEqual(["1", "2", "3", "4"]);
    expect(BUZZER_KEYS.red).toEqual(["7", "8", "9", "0"]);
  });
});

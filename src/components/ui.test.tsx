import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  ChoiceButton,
  Overlay,
  SectionLabel,
  SpeedHint,
  KeyboardHint,
  StartButton,
  TeamBadge,
  teamConfig,
} from "./ui";

describe("ChoiceButton", () => {
  it("merender label dan memanggil onClick", () => {
    const onClick = vi.fn();
    render(<ChoiceButton label="Duel 2 Tim" onClick={onClick} />);
    const btn = screen.getByRole("button", { name: "Duel 2 Tim" });
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("menonaktifkan tombol saat disabled", () => {
    const onClick = vi.fn();
    render(<ChoiceButton label="Mulai" onClick={onClick} disabled />);
    const btn = screen.getByRole("button", { name: "Mulai" });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("memberi gaya aksen saat aktif", () => {
    render(<ChoiceButton label="Aktif" onClick={() => {}} active accent="#a3e635" />);
    const btn = screen.getByRole("button", { name: "Aktif" });
    expect(btn).toHaveStyle({ backgroundColor: "#a3e635" });
  });
});

describe("StartButton", () => {
  it("menampilkan label & memicu aksi", () => {
    const onClick = vi.fn();
    render(<StartButton label="START GAME" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: "START GAME" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("Overlay", () => {
  it("tidak merender apa pun saat hidden", () => {
    const { container } = render(
      <Overlay hidden>
        <span>rahasia</span>
      </Overlay>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("merender anak saat terlihat", () => {
    render(
      <Overlay>
        <span>Menu</span>
      </Overlay>,
    );
    expect(screen.getByText("Menu")).toBeInTheDocument();
  });
});

describe("label kecil", () => {
  it("SectionLabel & SpeedHint menampilkan teks", () => {
    render(
      <>
        <SectionLabel accent="#a3e635">Kategori</SectionLabel>
        <SpeedHint />
      </>,
    );
    expect(screen.getByText("Kategori")).toBeInTheDocument();
    expect(screen.getByText(/bonus poin/i)).toBeInTheDocument();
  });
});

describe("KeyboardHint", () => {
  it("menampilkan tombol BLUE dan RED dalam mode duel", () => {
    render(<KeyboardHint solo={false} />);
    expect(screen.getByText("⌨️ BLUE")).toBeInTheDocument();
    expect(screen.getByText("RED")).toBeInTheDocument();
    // BLUE: 1-4, RED: 7 8 9 0 → 8 tombol total.
    expect(screen.getAllByRole("generic").length).toBeGreaterThan(0);
    for (const k of ["1", "2", "3", "4", "7", "8", "9", "0"]) {
      expect(screen.getByText(k)).toBeInTheDocument();
    }
  });

  it("menyembunyikan tombol RED dalam mode solo", () => {
    render(<KeyboardHint solo />);
    expect(screen.queryByText("RED")).not.toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });
});

describe("TeamBadge & teamConfig", () => {
  it("menampilkan skor dan label tim", () => {
    render(<TeamBadge side="blue" score={42} />);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Blue")).toBeInTheDocument();
  });

  it("teamConfig mengembalikan warna hex per tim", () => {
    expect(teamConfig("blue").hex).toBe("#38bdf8");
    expect(teamConfig("red").hex).toBe("#fb7185");
  });
});

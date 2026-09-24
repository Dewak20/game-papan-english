import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  FloatLayer,
  GameFooter,
  MenuButton,
  SoloScoreCard,
  TeamPanelHeader,
  TeamScoreBar,
} from "./gameParts";

describe("TeamScoreBar", () => {
  it("menampilkan skor kedua tim dalam mode duel", () => {
    render(<TeamScoreBar teams={{ blue: 12, red: 30 }} />);
    expect(screen.getByText(/TEAM BLUE · 12/)).toBeInTheDocument();
    expect(screen.getByText(/30 · TEAM RED/)).toBeInTheDocument();
  });

  it("menampilkan mode latihan mandiri saat solo", () => {
    render(<TeamScoreBar teams={{ blue: 7, red: 0 }} solo />);
    expect(screen.getByText(/LATIHAN MANDIRI/)).toBeInTheDocument();
    expect(screen.getByText("SKOR: 7")).toBeInTheDocument();
    expect(screen.queryByText(/TEAM RED/)).not.toBeInTheDocument();
  });
});

describe("TeamPanelHeader", () => {
  it("menampilkan nama tim & skor", () => {
    render(<TeamPanelHeader side="red" score={9} />);
    expect(screen.getByText("TEAM RED")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
  });

  it("menampilkan label solo bila diminta", () => {
    render(<TeamPanelHeader side="blue" score={3} solo soloLabel="🧑 KAMU" />);
    expect(screen.getByText("🧑 KAMU")).toBeInTheDocument();
    expect(screen.queryByText("TEAM BLUE")).not.toBeInTheDocument();
  });
});

describe("FloatLayer", () => {
  it("merender teks melayang dengan warna", () => {
    render(<FloatLayer floats={[{ id: 1, text: "+20", color: "#fbbf24", x: "50%", y: "42%" }]} />);
    expect(screen.getByText("+20")).toBeInTheDocument();
  });

  it("tidak merender apa pun saat daftar kosong", () => {
    const { container } = render(<FloatLayer floats={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("GameFooter", () => {
  it("menampilkan hak cipta", () => {
    render(<GameFooter />);
    expect(screen.getByText(/Dewa Krishnadana/)).toBeInTheDocument();
  });
});

describe("MenuButton", () => {
  it("menautkan kembali ke beranda", () => {
    render(<MenuButton />);
    expect(screen.getByRole("link", { name: "MENU" })).toHaveAttribute("href", "/");
  });
});

describe("SoloScoreCard", () => {
  it("menampilkan skor pemain", () => {
    render(<SoloScoreCard score={123} />);
    expect(screen.getByText("Skor Kamu")).toBeInTheDocument();
    expect(screen.getByText("123")).toBeInTheDocument();
  });
});

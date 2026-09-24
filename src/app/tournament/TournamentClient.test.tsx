import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const KEY = "blp:tournament:v1";

function seed(state: unknown) {
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

beforeEach(() => {
  window.localStorage.clear();
  vi.resetModules();
});

afterEach(() => {
  window.localStorage.clear();
});

describe("TournamentClient", () => {
  it("menampilkan layar pengaturan saat belum ada turnamen", async () => {
    const { default: TournamentClient } = await import("./TournamentClient");
    render(<TournamentClient />);
    expect(screen.getByText("🏆 TURNAMEN KELAS")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "MULAI TURNAMEN" })).toBeInTheDocument();
  });

  it("membuat turnamen lalu menampilkan klasemen", async () => {
    const { default: TournamentClient } = await import("./TournamentClient");
    render(<TournamentClient />);

    fireEvent.click(screen.getByRole("button", { name: "MULAI TURNAMEN" }));

    // Klasemen muncul dengan nama tim default.
    expect(await screen.findByText("Klasemen")).toBeInTheDocument();
    expect(screen.getAllByText("Tim Biru").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tim Merah").length).toBeGreaterThan(0);
  });

  it("menghitung klasemen dari turnamen tersimpan", async () => {
    seed({
      config: {
        title: "Piala Kelas",
        teams: [
          { id: "t1", name: "Alpha" },
          { id: "t2", name: "Bravo" },
        ],
        games: ["tebak-gambar"],
        rounds: 1,
        pointsWin: 3,
        pointsDraw: 1,
        pointsLoss: 0,
      },
      matches: [
        {
          id: "r1-t1-t2",
          round: 1,
          gameSlug: "tebak-gambar",
          homeId: "t1",
          awayId: "t2",
          homeScore: 10,
          awayScore: 4,
        },
      ],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const { default: TournamentClient } = await import("./TournamentClient");
    render(<TournamentClient />);

    expect(screen.getByText("Piala Kelas")).toBeInTheDocument();
    // Juara & poin pemenang.
    expect(screen.getByText(/🏆 Alpha/)).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});

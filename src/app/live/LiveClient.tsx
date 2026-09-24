"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { games } from "@/lib/games";
import { saveHostToken, useLiveRoom, type RoomView } from "@/lib/useLiveRoom";

/** Game yang bisa dipilih sebagai konteks turnamen ruang. */
const roomGames = games.filter((g) => g.slug !== "rank");

function ScoreRow({
  rank,
  name,
  score,
  isMe,
  onAdd,
  onRemove,
  showControls,
}: {
  rank: number;
  name: string;
  score: number;
  isMe: boolean;
  onAdd?: (delta: number) => void;
  onRemove?: () => void;
  showControls: boolean;
}) {
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 transition-colors ${
        isMe ? "border-gold/60 bg-gold/10" : "border-line bg-white/5"
      }`}
    >
      <span className="w-10 text-center font-display text-xl text-muted">{medal}</span>
      <span className="flex-1 truncate font-display text-2xl text-white">
        {name}
        {isMe ? <span className="ml-2 text-xs font-bold text-gold">(kamu)</span> : null}
      </span>
      <span className="font-timer text-3xl text-gold tabular-nums">{score}</span>
      {showControls && onAdd ? (
        <div className="flex gap-1.5">
          {[1, 5, 10].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onAdd(d)}
              className="focus-ring h-9 w-11 cursor-pointer rounded-lg border border-green/50 bg-green/15 font-bold text-green transition-colors hover:bg-green/30"
            >
              +{d}
            </button>
          ))}
          {onRemove ? (
            <button
              type="button"
              onClick={onRemove}
              className="focus-ring h-9 w-9 cursor-pointer rounded-lg border border-red/40 bg-red/10 font-bold text-red transition-colors hover:bg-red/25"
              aria-label={`Keluarkan ${name}`}
            >
              ✕
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function LiveClient() {
  const router = useRouter();
  const params = useSearchParams();
  const codeParam = (params.get("code") ?? "").toUpperCase();

  const [title, setTitle] = useState("Turnamen Kelas");
  const [gameSlug, setGameSlug] = useState(roomGames[0]?.slug ?? "bebas");
  const [joinCode, setJoinCode] = useState(codeParam);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);

  const room = useLiveRoom(codeParam || null);
  const { view, playerId, isHost } = room;

  // Bila URL belum memuat kode tetapi perangkat ini adalah host ruang,
  // arahkan ke kode tersimpan agar refresh tetap bekerja.
  useEffect(() => {
    if (codeParam) return;
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("blp:room:lastHost:v1");
    if (stored) router.replace(`/live?code=${stored}`);
  }, [codeParam, router]);

  const joinUrl = useMemo(() => {
    if (typeof window === "undefined" || !view) return "";
    return `${window.location.origin}/live?code=${view.code}`;
  }, [view]);

  async function createRoom() {
    setCreating(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, gameSlug }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { view: RoomView; hostToken: string };
        error?: string;
      };
      if (json.ok && json.data) {
        saveHostToken(json.data.view.code, json.data.hostToken);
        window.localStorage.setItem("blp:room:lastHost:v1", json.data.view.code);
        router.push(`/live?code=${json.data.view.code}`);
      } else {
        alert(json.error ?? "Gagal membuat ruang.");
      }
    } catch {
      alert("Tidak dapat menghubungi server.");
    } finally {
      setCreating(false);
    }
  }

  async function joinRoom() {
    if (!joinCode.trim() || !name.trim()) {
      alert("Isi kode ruang dan namamu dulu ya!");
      return;
    }
    setJoining(true);
    const id = await room.join(name);
    setJoining(false);
    if (!id) return;
    router.push(`/live?code=${joinCode.trim().toUpperCase()}`);
  }

  async function copyLink() {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* abaikan */
    }
  }

  // ── 1. Tanpa kode: layar pembuka (buat / gabung) ────────────────────────
  if (!codeParam) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
        <Link href="/" className="focus-ring text-sm font-semibold text-muted hover:text-white">
          ← Menu
        </Link>
        <header className="text-center">
          <h1 className="font-display text-5xl text-white">📡 RUANG KELAS</h1>
          <p className="mt-3 text-muted">
            Papan besar jadi &ldquo;server&rdquo;, HP siswa untuk mengirim skor — tanpa
            aplikasi tambahan.
          </p>
        </header>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Buat ruang (guru) */}
          <section className="panel flex flex-col gap-4 border-2 border-line p-6">
            <h2 className="font-display text-2xl text-gold">🖥️ Buat Ruang (Guru)</h2>
            <label className="text-sm text-muted">
              Nama turnamen
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={60}
                className="focus-ring mt-1 w-full rounded-xl border-2 border-line bg-ink-soft px-4 py-2.5 text-white"
              />
            </label>
            <label className="text-sm text-muted">
              Game
              <select
                value={gameSlug}
                onChange={(e) => setGameSlug(e.target.value)}
                className="focus-ring mt-1 w-full rounded-xl border-2 border-line bg-ink-soft px-4 py-2.5 text-white"
              >
                <option value="bebas">Bebas / campuran</option>
                {roomGames.map((g) => (
                  <option key={g.slug} value={g.slug}>
                    {g.icon} {g.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={createRoom}
              disabled={creating}
              className="btn-3d focus-ring mt-2 cursor-pointer bg-green px-6 py-3 text-xl text-ink shadow-[0_8px_0_#047857] disabled:opacity-50"
            >
              {creating ? "Membuat…" : "BUKA RUANG"}
            </button>
            <p className="text-xs text-muted">
              Setelah ruang dibuka, minta siswa membuka tautan/kode yang muncul di layar.
            </p>
          </section>

          {/* Gabung (siswa) */}
          <section className="panel flex flex-col gap-4 border-2 border-line p-6">
            <h2 className="font-display text-2xl text-blue">📱 Gabung (Siswa)</h2>
            <label className="text-sm text-muted">
              Kode ruang
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={4}
                placeholder="mis. K7P2"
                className="focus-ring mt-1 w-full rounded-xl border-2 border-line bg-ink-soft px-4 py-2.5 font-timer text-2xl tracking-[0.4em] text-white uppercase"
              />
            </label>
            <label className="text-sm text-muted">
              Nama / tim
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={24}
                placeholder="mis. Tim Biru"
                className="focus-ring mt-1 w-full rounded-xl border-2 border-line bg-ink-soft px-4 py-2.5 text-white"
              />
            </label>
            <button
              type="button"
              onClick={joinRoom}
              disabled={joining}
              className="btn-3d focus-ring mt-2 cursor-pointer bg-blue px-6 py-3 text-xl text-ink shadow-[0_8px_0_#0369a1] disabled:opacity-50"
            >
              {joining ? "Masuk…" : "MASUK RUANG"}
            </button>
          </section>
        </div>
      </main>
    );
  }

  // ── 2. Ruang tidak ditemukan ────────────────────────────────────────────
  if (room.error && !view) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-5 p-6 text-center">
        <span className="text-6xl">🕵️</span>
        <h1 className="font-display text-3xl text-white">Ruang tidak ditemukan</h1>
        <p className="text-muted">{room.error}</p>
        <Link
          href="/live"
          className="focus-ring rounded-xl border-2 border-line bg-white/5 px-6 py-3 font-semibold text-white hover:border-gold/60"
        >
          ← Kembali
        </Link>
      </main>
    );
  }

  if (!view) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-gold" />
      </main>
    );
  }

  const ranked = [...view.players].sort(
    (a, b) => b.score - a.score || a.name.localeCompare(b.name),
  );
  const me = view.players.find((p) => p.id === playerId) ?? null;
  const joined = !!me;

  // ── 3. Tampilan PEMAIN (HP) ─────────────────────────────────────────────
  if (!isHost && joined) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 p-5">
        <header className="text-center">
          <p className="text-xs tracking-[0.3em] text-muted uppercase">Ruang</p>
          <p className="font-timer text-4xl tracking-[0.3em] text-gold">{view.code}</p>
          <h1 className="mt-2 font-display text-2xl text-white">{view.title}</h1>
        </header>

        <div className="panel border-2 border-gold/50 bg-gold/5 p-6 text-center">
          <p className="text-sm tracking-widest text-muted uppercase">Skormu</p>
          <p className="font-timer text-7xl text-gold">{me?.score ?? 0}</p>
          <p className="mt-1 font-display text-xl text-white">{me?.name}</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[1, 5, 10].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => me && room.addScore(me.id, d, "add")}
              className="btn-3d focus-ring cursor-pointer bg-green py-5 font-display text-3xl text-ink shadow-[0_8px_0_#047857] active:translate-y-1 active:shadow-[0_4px_0_#047857]"
            >
              +{d}
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-muted">
          Ketuk tombol saat timmu menjawab benar — papan besar langsung diperbarui.
        </p>

        <div className="mt-auto">
          <h2 className="mb-2 text-xs tracking-widest text-muted uppercase">Klasemen</h2>
          <div className="flex flex-col gap-2">
            {ranked.map((p, i) => (
              <ScoreRow
                key={p.id}
                rank={i + 1}
                name={p.name}
                score={p.score}
                isMe={p.id === playerId}
                showControls={false}
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ── 4. Tampilan GABUNG (belum masuk) ────────────────────────────────────
  if (!isHost && !joined) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-5 p-6">
        <p className="text-xs tracking-[0.3em] text-muted uppercase">Ruang</p>
        <p className="font-timer text-6xl tracking-[0.3em] text-gold">{view.code}</p>
        <h1 className="text-center font-display text-2xl text-white">{view.title}</h1>
        <label className="w-full text-sm text-muted">
          Nama / tim
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            placeholder="mis. Tim Merah"
            className="focus-ring mt-1 w-full rounded-xl border-2 border-line bg-ink-soft px-4 py-3 text-white"
          />
        </label>
        <button
          type="button"
          onClick={joinRoom}
          disabled={joining}
          className="btn-3d focus-ring w-full cursor-pointer bg-blue py-4 text-2xl text-ink shadow-[0_8px_0_#0369a1] disabled:opacity-50"
        >
          {joining ? "Masuk…" : "MASUK"}
        </button>
        <p className="text-xs text-muted">{view.players.length} pemain sudah bergabung</p>
      </main>
    );
  }

  // ── 5. Tampilan HOST (papan besar) ──────────────────────────────────────
  const phaseLabel =
    view.phase === "lobby" ? "LOBI" : view.phase === "playing" ? "BERJALAN" : "SELESAI";

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-5 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.3em] text-muted uppercase">
            Ruang Kelas · {phaseLabel}
          </p>
          <h1 className="font-display text-4xl text-white">{view.title}</h1>
        </div>
        <div className="text-right">
          <p className="text-xs tracking-widest text-muted uppercase">Kode</p>
          <p className="font-timer text-4xl tracking-[0.3em] text-gold">{view.code}</p>
        </div>
      </header>

      <div className="panel flex flex-wrap items-center justify-between gap-4 border-2 border-line p-5">
        <div>
          <p className="text-sm text-muted">
            Buka di HP: <span className="font-semibold text-white">{joinUrl}</span>
          </p>
          <p className="text-xs text-muted">
            atau buka <span className="text-white">/live</span> lalu masukkan kode{" "}
            <span className="font-timer text-gold">{view.code}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={copyLink}
          className="focus-ring cursor-pointer rounded-xl border-2 border-line bg-white/5 px-5 py-2.5 font-semibold text-white hover:border-gold/60"
        >
          {copied ? "✅ Tersalin" : "🔗 Salin tautan"}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        {view.phase !== "playing" ? (
          <button
            type="button"
            onClick={() => room.setPhase("playing")}
            className="btn-3d focus-ring cursor-pointer bg-green px-6 py-2.5 text-lg text-ink shadow-[0_6px_0_#047857]"
          >
            ▶ Mulai
          </button>
        ) : null}
        {view.phase !== "ended" ? (
          <button
            type="button"
            onClick={() => room.setPhase("ended")}
            className="btn-3d focus-ring cursor-pointer bg-red px-6 py-2.5 text-lg text-ink shadow-[0_6px_0_#b91c1c]"
          >
            ⏹ Selesai
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            if (confirm("Reset semua skor ke 0?")) room.resetScores();
          }}
          className="focus-ring cursor-pointer rounded-xl border-2 border-line bg-white/5 px-6 py-2.5 font-semibold text-muted hover:border-gold/60 hover:text-white"
        >
          ♻️ Reset skor
        </button>
      </div>

      <section className="flex flex-1 flex-col gap-2">
        <h2 className="text-xs tracking-widest text-muted uppercase">
          Klasemen · {view.players.length} pemain
        </h2>
        {ranked.length === 0 ? (
          <div className="panel flex flex-1 flex-col items-center justify-center gap-3 border-2 border-dashed border-line p-10 text-center">
            <span className="animate-bob text-5xl">📲</span>
            <p className="text-muted">
              Menunggu pemain bergabung… minta siswa membuka tautan di atas.
            </p>
          </div>
        ) : (
          ranked.map((p, i) => (
            <ScoreRow
              key={p.id}
              rank={i + 1}
              name={p.name}
              score={p.score}
              isMe={false}
              showControls
              onAdd={(d) => room.addScore(p.id, d, "add")}
              onRemove={() => room.removePlayer(p.id)}
            />
          ))
        )}
      </section>

      <footer className="text-center text-xs text-muted">
        Papan besar menyegarkan otomatis setiap 2 detik · © {new Date().getFullYear()} Dewa
        Krishnadana
      </footer>
    </main>
  );
}

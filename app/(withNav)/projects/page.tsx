"use client";

import Link from "next/link";
import ProjectPreviewCard from "@/components/ProjectPreviewCard";

/* ── Chess board mock ── */
function ChessMock() {
  const rows = [
    ["♜","♞","♝","♛","♚","♝","♞","♜"],
    ["♟","♟","♟","♟","♟","♟","♟","♟"],
    Array(8).fill(""),
    Array(8).fill(""),
    Array(8).fill(""),
    Array(8).fill(""),
    ["♙","♙","♙","♙","♙","♙","♙","♙"],
    ["♖","♘","♗","♕","♔","♗","♘","♖"],
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {rows.map((row, r) => (
        <div key={r} style={{ display: "flex" }}>
          {row.map((piece, c) => (
            <div
              key={c}
              style={{
                width: 28, height: 28,
                background: (r + c) % 2 === 0 ? "#f0d9b5" : "#b58863",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, lineHeight: 1, color: r < 2 ? "#1a1a1a" : "#fff",
                flexShrink: 0,
              }}
            >
              {piece}
            </div>
          ))}
        </div>
      ))}
      <div style={{ marginTop: 8, fontSize: "0.7rem", color: "#888" }}>
        ~1600 Elo · RTX 3060 Ti · 6.4M positions
      </div>
    </div>
  );
}

/* ── Kalshi chart mock ── */
function KalshiMock() {
  const bars = [42, 61, 38, 75, 55, 80, 67, 90, 72, 85];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
        <span style={{ fontSize: "0.72rem", color: "#22c55e", fontFamily: "monospace" }}>LIVE · 270K+ snapshots</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 60 }}>
        {bars.map((h, i) => (
          <div
            key={i}
            style={{
              flex: 1, height: `${h}%`,
              background: i === bars.length - 1 ? "#e50914" : "#333",
              borderRadius: 2,
              transition: "height 0.3s ease",
            }}
          />
        ))}
      </div>
      <div style={{ marginTop: 8, fontSize: "0.7rem", color: "#888", fontFamily: "monospace" }}>
        A/B strategies · SQLite WAL · daemon
      </div>
    </div>
  );
}

/* ── Bonfire chat mock ── */
function BonfireMock() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: "0.7rem", color: "#888", marginBottom: 2 }}>Room: #wildcard · 3 players</div>
      {[
        { name: "Vitaliy", msg: "your turn 🎯", self: true },
        { name: "Alex",    msg: "no way that's the answer", self: false },
        { name: "AI",      msg: "✨ Generating prompt...", self: false, ai: true },
      ].map((m) => (
        <div
          key={m.name}
          style={{
            alignSelf: m.self ? "flex-end" : "flex-start",
            background: m.ai ? "rgba(139,92,246,0.2)" : m.self ? "#e50914" : "#2a2a2a",
            border: m.ai ? "1px solid rgba(139,92,246,0.4)" : "none",
            borderRadius: 10, padding: "5px 10px", maxWidth: "85%",
          }}
        >
          <div style={{ fontSize: "0.6rem", color: m.self ? "#ffaaaa" : "#888", marginBottom: 2 }}>{m.name}</div>
          <div style={{ fontSize: "0.75rem", color: "#fff" }}>{m.msg}</div>
        </div>
      ))}
    </div>
  );
}

/* ── FlashTrades mock ── */
function FlashTradesMock() {
  const candles = [
    { o: 60, h: 75, l: 55, c: 70 },
    { o: 70, h: 80, l: 65, c: 62 },
    { o: 62, h: 68, l: 50, c: 55 },
    { o: 55, h: 72, l: 52, c: 68 },
    { o: 68, h: 85, l: 65, c: 80 },
  ];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 64 }}>
        {candles.map((c, i) => {
          const bull = c.c >= c.o;
          const bodyH = Math.abs(c.c - c.o);
          const bodyTop = (100 - Math.max(c.o, c.c)) / 100 * 64;
          return (
            <div key={i} style={{ flex: 1, position: "relative", height: 64 }}>
              <div style={{
                position: "absolute", left: "50%", transform: "translateX(-50%)",
                width: 1, top: (100 - c.h) / 100 * 64, height: (c.h - c.l) / 100 * 64,
                background: bull ? "#22c55e" : "#e50914",
              }} />
              <div style={{
                position: "absolute", left: "15%", right: "15%",
                top: bodyTop, height: Math.max(bodyH / 100 * 64, 3),
                background: bull ? "#22c55e" : "#e50914",
                borderRadius: 1,
              }} />
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 8, fontSize: "0.7rem", color: "#888" }}>
        &lt;15 KB · zero frameworks · canvas
      </div>
    </div>
  );
}

/* ── SwipeHire mock ── */
function SwipeHireMock() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{
        background: "#1e1e1e", borderRadius: 8, padding: "10px 12px",
        border: "1px solid #333", position: "relative",
      }}>
        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#fff" }}>Jane Smith</div>
        <div style={{ fontSize: "0.65rem", color: "#888" }}>Senior SWE · Google · 5 yrs exp</div>
        <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
          {["React","Python","Go"].map(t => (
            <span key={t} style={{ fontSize: "0.6rem", background: "#2a2a2a", color: "#ccc", padding: "2px 6px", borderRadius: 4 }}>{t}</span>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <div style={{ padding: "4px 16px", background: "#e50914", borderRadius: 20, fontSize: "0.7rem", fontWeight: 700 }}>✓ Star</div>
        <div style={{ padding: "4px 16px", background: "#333", borderRadius: 20, fontSize: "0.7rem" }}>✗ Pass</div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <div className="projects-container">
      <Link href="/browse" style={{ color: "#e50914", marginBottom: "20px", display: "inline-block" }}>← Back</Link>
      <h1 className="skills-title" style={{ marginBottom: "8px" }}>Projects</h1>
      <p style={{ color: "#666", fontSize: "0.85rem", marginBottom: "40px" }}>hover to interact · click GitHub/Live to open</p>

      <h2 style={{ color: "#aaa", fontSize: "0.85rem", letterSpacing: "0.1em", textTransform: "uppercase", borderLeft: "3px solid #e50914", paddingLeft: 12, marginBottom: 24 }}>
        Featured
      </h2>
      <div className="ppc-row" style={{ marginBottom: 48 }}>
        <ProjectPreviewCard
          title="Chess960-NN"
          url="chess960-nn.hf.space"
          tech={["PyTorch","MCTS","FastAPI","ResNet"]}
          githubUrl="https://github.com/Vitaliy-Pikalo"
          liveUrl="https://chess960-nn.hf.space"
        >
          <ChessMock />
        </ProjectPreviewCard>

        <ProjectPreviewCard
          title="Kalshi Trading Bot"
          url="kalshi-bot/dashboard"
          tech={["Python","SQLite","REST APIs","scikit-learn"]}
          githubUrl="https://github.com/Vitaliy-Pikalo/kalshi-trading-bot"
        >
          <KalshiMock />
        </ProjectPreviewCard>

        <ProjectPreviewCard
          title="Bonfire"
          url="bonfire-app.flutter"
          tech={["Flutter","Firebase","Groq LLM","Riverpod"]}
          githubUrl="https://github.com/Vitaliy-Pikalo"
        >
          <BonfireMock />
        </ProjectPreviewCard>
      </div>

      <h2 style={{ color: "#aaa", fontSize: "0.85rem", letterSpacing: "0.1em", textTransform: "uppercase", borderLeft: "3px solid #333", paddingLeft: 12, marginBottom: 24 }}>
        Also Built
      </h2>
      <div className="ppc-row">
        <ProjectPreviewCard
          title="FlashTrades"
          url="flashtrades.netlify.app"
          tech={["JavaScript","Canvas","&lt;15 KB"]}
          liveUrl="https://flashtrades.netlify.app"
        >
          <FlashTradesMock />
        </ProjectPreviewCard>

        <ProjectPreviewCard
          title="SwipeHire"
          url="swipehire.app"
          tech={["React","Tailwind"]}
          githubUrl="https://github.com/Vitaliy-Pikalo"
        >
          <SwipeHireMock />
        </ProjectPreviewCard>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GameEngine, HudState } from "@/lib/game/engine";
import { boss, defeat, intro, shrines, victory, type Shrine, type UnitKind } from "@/lib/game/story";

const RESUME = "/Vitaliy_Pikalo_resume.pdf";

const UNIT_LABEL: Record<UnitKind, string> = {
  hero: "Vitaliy",
  engineer: "Engineer",
  strategist: "Strategist",
  quant: "Quant Archer",
  banner: "Banner Bearer",
  builder: "Builder",
};

const UNIT_COLOR: Record<UnitKind, string> = {
  hero: "#c9a24a",
  engineer: "#7e9a63",
  strategist: "#8fb3e0",
  quant: "#e3c06a",
  banner: "#c97b7b",
  builder: "#b08ad6",
};

type Panel =
  | { type: "intro" }
  | { type: "shrine"; shrine: Shrine }
  | { type: "boss" }
  | { type: "end"; result: "won" | "lost" }
  | null;

export default function Campaign() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [hud, setHud] = useState<HudState | null>(null);
  const [panel, setPanel] = useState<Panel>({ type: "intro" });
  const [page, setPage] = useState(0);
  const [failed, setFailed] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const panelOpen = useRef(true);
  useEffect(() => {
    panelOpen.current = panel !== null;
  }, [panel]);

  useEffect(() => {
    let engine: GameEngine | null = null;
    let cancelled = false;
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return;

    const probe = document.createElement("canvas");
    if (!probe.getContext("webgl2") && !probe.getContext("webgl")) {
      setFailed(true);
      return;
    }

    import("@/lib/game/engine")
      .then(({ GameEngine }) => {
        if (cancelled) return;
        engine = new GameEngine(canvas, overlay, {
          onHud: setHud,
          onShrine: (s) => {
            setPage(0);
            setPanel({ type: "shrine", shrine: s });
          },
          onBossAggro: () => {
            engine?.setPaused(true);
            setPage(0);
            setPanel({ type: "boss" });
          },
          onEnd: (result) => {
            setPage(0);
            setPanel({ type: "end", result });
          },
        });
        engine.setPaused(panelOpen.current); // stay paused while the prologue is open
        engineRef.current = engine;
        if (new URLSearchParams(window.location.search).has("debug")) {
          (window as unknown as { __campaign?: GameEngine }).__campaign = engine;
        }
      })
      .catch(() => setFailed(true));

    return () => {
      cancelled = true;
      engine?.dispose();
      engineRef.current = null;
    };
  }, [runKey]);

  const closePanel = useCallback(() => {
    const e = engineRef.current;
    if (panel?.type === "shrine") e?.recruitFrom(panel.shrine.id);
    setPanel(null);
    setPage(0);
    if (panel?.type !== "end") e?.setPaused(false);
  }, [panel]);

  const restart = () => {
    setHud(null);
    setPage(0);
    setPanel({ type: "intro" });
    setRunKey((k) => k + 1);
  };

  if (failed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-deep p-6">
        <div className="stone-tablet max-w-md p-8 text-center">
          <h1 className="font-display text-2xl font-bold text-bone">The campaign needs WebGL</h1>
          <p className="mt-3">Your browser or device can&apos;t run the 3D game. Everything in it is also on the main site.</p>
          <div className="mt-6 flex justify-center gap-4">
            <Link href="/" className="btn-gold">Back to site</Link>
            <a href={RESUME} target="_blank" rel="noopener noreferrer" className="btn-stone">Open resume</a>
          </div>
        </div>
      </div>
    );
  }

  const recruited = hud?.warband.length ?? 0;

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-stone-deep text-sm">
      <canvas key={runKey} ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" aria-label="Game world. Click or tap the ground to move your hero." />
      <div ref={overlayRef} className="pointer-events-none absolute inset-0" aria-hidden />

      {/* Top bar */}
      <div className="hud-bar absolute inset-x-0 top-0 border-b-2 flex items-center justify-between gap-3 px-3 py-2 sm:px-5">
        <Link href="/" className="btn-stone">Back to site</Link>
        <p className="hidden font-display font-semibold tracking-wide text-bone md:block">The campaign of Vitaliy Pikalo</p>
        <a href={RESUME} target="_blank" rel="noopener noreferrer" className="btn-gold">Skip to resume</a>
      </div>

      {/* Boss health */}
      {hud?.bossAggro && (
        <div className="absolute left-1/2 top-16 w-[min(90vw,28rem)] -translate-x-1/2" role="status">
          <p className="mb-1 text-center font-display font-semibold text-bone">{boss.name}</p>
          <div className="h-3 overflow-hidden rounded-sm border border-gold-dim bg-stone-deep">
            <div className="h-full bg-[#c25b4a] transition-[width] duration-100" style={{ width: `${(hud.bossHp / hud.bossMax) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Bottom console */}
      <div className="hud-bar absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-x-3 gap-y-2 border-t-2 px-3 pb-3 pt-2 sm:flex-nowrap sm:items-end sm:px-5">
        <div className="flex items-center gap-3">
          <div className="portrait" style={{ borderColor: UNIT_COLOR.hero }}>V</div>
          <div>
            <p className="font-medium text-bone">Vitaliy</p>
            <p className="text-xs text-muted">{hud ? `${hud.heroHp} / ${hud.heroMax}` : "..."}</p>
          </div>
        </div>

        <div className="order-last w-full min-w-0 sm:order-none sm:w-auto sm:flex-1">
          <p className="mb-1 text-xs text-muted">
            Warband {recruited} / {shrines.length}
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {shrines.map((s, i) => {
              const u = hud?.warband[i];
              return (
                <li
                  key={s.id}
                  title={u ? UNIT_LABEL[u.kind] : "Not recruited yet"}
                  className="relative h-8 w-8 overflow-hidden rounded-sm border bg-stone-deep sm:h-9 sm:w-9"
                  style={{ borderColor: u ? UNIT_COLOR[u.kind] : "#3a4558" }}
                >
                  {u && (
                    <>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold" style={{ color: UNIT_COLOR[u.kind] }}>
                        {UNIT_LABEL[u.kind][0]}
                      </span>
                      <span className="absolute inset-x-0 bottom-0 h-1 bg-moss" style={{ width: `${(u.hp / u.max) * 100}%`, opacity: u.hp > 0 ? 1 : 0 }} />
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="ml-auto flex gap-2">
          <AbilityButton label="Deploy" hotkey="Q" cd={hud?.deployCd ?? 0} max={8} onUse={() => engineRef.current?.deploy()} hint="Shockwave around your hero" />
          <AbilityButton label="Rally" hotkey="W" cd={hud?.rallyCd ?? 0} max={15} onUse={() => engineRef.current?.rally()} hint="Heal the whole warband" />
        </div>
      </div>

      {!panel && hud?.status === "explore" && recruited === 0 && (
        <p className="absolute left-1/2 top-16 -translate-x-1/2 rounded-sm bg-stone-deep/80 px-3 py-1.5 text-center text-xs text-bone">
          Click or tap the ground to move. Follow the road to the first glowing shrine.
        </p>
      )}

      {panel && (
        <Dialogue
          panel={panel}
          page={page}
          setPage={setPage}
          onClose={closePanel}
          onRestart={restart}
          recruited={recruited}
        />
      )}
    </div>
  );
}

function AbilityButton({ label, hotkey, cd, max, onUse, hint }: { label: string; hotkey: string; cd: number; max: number; onUse: () => void; hint: string }) {
  const ready = cd <= 0;
  return (
    <button type="button" onClick={onUse} disabled={!ready} title={hint} className="ability" aria-label={`${label} (${hotkey}): ${hint}${ready ? "" : `, ready in ${Math.ceil(cd)} seconds`}`}>
      <span className="text-xs font-semibold text-bone">{label}</span>
      <span className="text-[10px] text-muted">{hotkey}</span>
      {!ready && (
        <span className="absolute inset-0 flex items-center justify-center bg-stone-deep/70 text-base font-semibold text-bone">
          <span className="absolute inset-x-0 bottom-0 bg-gold/25" style={{ height: `${(cd / max) * 100}%` }} />
          <span className="relative">{Math.ceil(cd)}</span>
        </span>
      )}
    </button>
  );
}

function Dialogue({
  panel,
  page,
  setPage,
  onClose,
  onRestart,
  recruited,
}: {
  panel: NonNullable<Panel>;
  page: number;
  setPage: (n: number) => void;
  onClose: () => void;
  onRestart: () => void;
  recruited: number;
}) {
  let title = "";
  let lines: string[] = [];
  let action = "Continue";
  let extra: React.ReactNode = null;

  if (panel.type === "intro") {
    title = intro.title;
    lines = intro.lines;
    action = "Begin";
  } else if (panel.type === "shrine") {
    title = panel.shrine.title;
    lines = panel.shrine.lines;
    action = `Recruit ${panel.shrine.recruitName}`;
    extra = (
      <p className="mt-4 border-t border-stone-edge pt-3 text-xs">
        <span className="font-semibold" style={{ color: UNIT_COLOR[panel.shrine.recruit] }}>
          {panel.shrine.recruitName}:
        </span>{" "}
        {panel.shrine.recruitBlurb}
      </p>
    );
  } else if (panel.type === "boss") {
    title = boss.name;
    lines = [
      boss.intro,
      recruited < 3
        ? `You have ${recruited} of ${shrines.length} recruits. You can retreat south to reset the fight and recruit more.`
        : "Your warband is ready. Use Deploy (Q) when the giant is close and Rally (W) when your troops are hurt.",
    ];
    action = "Fight";
  } else {
    const won = panel.result === "won";
    title = won ? victory.title : defeat.title;
    lines = won ? victory.lines : defeat.lines;
  }

  const last = page >= lines.length - 1;

  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-stone-deep/40 p-3 pb-28 sm:items-center sm:pb-3" role="dialog" aria-modal="true" aria-labelledby="dialogue-title">
      <div className="stone-tablet w-full max-w-lg p-6 sm:p-8">
        <h2 id="dialogue-title" className="font-display text-xl font-bold tracking-wide text-bone">
          {title}
        </h2>
        <p className="mt-4 min-h-[5.5rem] text-base leading-relaxed text-bone/90" aria-live="polite">
          {lines[page]}
        </p>
        {last && extra}
        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-xs text-muted">
            {page + 1} / {lines.length}
          </p>
          <div className="flex gap-2">
            {panel.type === "end" && last ? (
              panel.result === "won" ? (
                <>
                  <Link href="/" className="btn-stone">Back to site</Link>
                  <a href={RESUME} target="_blank" rel="noopener noreferrer" className="btn-gold" autoFocus>
                    Open the resume
                  </a>
                </>
              ) : (
                <>
                  <Link href="/" className="btn-stone">Back to site</Link>
                  <button type="button" onClick={onRestart} className="btn-gold" autoFocus>Try again</button>
                </>
              )
            ) : (
              <button type="button" className="btn-gold" autoFocus onClick={() => (last ? onClose() : setPage(page + 1))}>
                {last ? action : "Next"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

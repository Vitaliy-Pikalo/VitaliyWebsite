"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Difficulty, GameEngine, HudState, MapInfo, UnitInfo } from "@/lib/game/engine";
import { abilities, boss, defeat, difficulties, intro, shrines, victory, type AbilityId, type Shrine, type UnitKind } from "@/lib/game/story";
import { STATS } from "@/lib/game/units";
import Minimap from "./Minimap";

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

const UNIT_ROLE: Record<UnitKind, string> = {
  hero: "Your hero. He fights on his own; you use his abilities. If Vitaliy falls, the campaign is lost.",
  ...Object.fromEntries(shrines.map((s) => [s.recruit, s.recruitBlurb])),
} as Record<UnitKind, string>;

const ORDER_LABEL: Record<UnitInfo["order"], string> = {
  idle: "Standing by",
  follow: "Following Vitaliy",
  move: "Moving",
  attackMove: "Attack-moving",
  attack: "Attacking",
  hold: "Holding position",
};

type Panel =
  | { type: "controls" }
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
  const [mapInfo, setMapInfo] = useState<MapInfo | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const difficultyRef = useRef<Difficulty | null>(null);
  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);
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
        if (difficultyRef.current) engine.setDifficulty(difficultyRef.current);
        engine.setPaused(panelOpen.current); // stay paused while the prologue is open
        engineRef.current = engine;
        setMapInfo(engine.mapInfo);
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
    if (panel?.type === "controls" && hud && (hud.status === "won" || hud.status === "lost")) {
      setPanel({ type: "end", result: hud.status });
      return;
    }
    setPanel(null);
    setPage(0);
    if (panel?.type !== "end") e?.setPaused(false);
  }, [panel, hud]);

  const openControls = () => {
    if (panel) return;
    engineRef.current?.setPaused(true);
    setPage(0);
    setPanel({ type: "controls" });
  };

  const restart = () => {
    setHud(null);
    setPage(0);
    // A retry keeps the chosen difficulty and skips the prologue.
    setPanel(difficultyRef.current ? null : { type: "intro" });
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
  const e = () => engineRef.current;
  const sel = hud?.selection ?? [];

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-stone-deep text-sm">
      <canvas
        key={runKey}
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        aria-label="Game world. Click or tap the ground to move the selected units. Drag to select several."
      />
      <div ref={overlayRef} className="pointer-events-none absolute inset-0" aria-hidden />

      {/* Top bar */}
      <div className="hud-bar absolute inset-x-0 top-0 flex items-center justify-between gap-2 border-b-2 px-3 py-2 sm:px-5">
        <div className="flex gap-2">
          <Link href="/" className="btn-stone">Back to site</Link>
          <button type="button" className="btn-stone" onClick={openControls}>Controls</button>
        </div>
        <p className="hidden font-display font-semibold tracking-wide text-bone lg:block">The campaign of Vitaliy Pikalo</p>
        <a href={RESUME} target="_blank" rel="noopener noreferrer" className="btn-gold">Skip to resume</a>
      </div>

      {/* Boss health */}
      {hud?.bossAggro && (
        <div className="pointer-events-none absolute left-1/2 top-16 w-[min(90vw,28rem)] -translate-x-1/2" role="status">
          <p className="mb-1 text-center font-display font-semibold text-bone">{boss.name}</p>
          <div className={`h-3 overflow-hidden rounded-sm border bg-stone-deep ${hud.stoneSkin ? "border-[#b08ad6]" : "border-gold-dim"}`}>
            <div
              className="h-full transition-[width] duration-100"
              style={{ width: `${(hud.bossHp / hud.bossMax) * 100}%`, background: hud.stoneSkin ? "#8c8a80" : "#c25b4a" }}
            />
          </div>
          {hud.stoneSkin && (
            <p className="mt-1 text-center text-xs text-bone">
              Stone skin: half damage until the {hud.shards} {hud.shards === 1 ? "shard falls" : "shards fall"}
            </p>
          )}
        </div>
      )}

      {/* Boulder warning */}
      {!panel && hud?.marked && (
        <div className="warning" role="alert">
          <span>Boulder incoming on your {UNIT_LABEL[hud.marked.kind]}. Move it out of the red zone before it fills.</span>
          {hud.marked.kind !== "hero" && (
            <button type="button" className="btn-stone" onClick={() => e()?.selectUnit(hud.marked!.id)}>
              Select {UNIT_LABEL[hud.marked.kind]}
            </button>
          )}
        </div>
      )}

      {/* Hints */}
      {!panel && hud?.pendingAttackMove && (
        <p className="hint">Attack-move: click a point or the giant. Esc cancels.</p>
      )}
      {!panel && !hud?.pendingAttackMove && !hud?.bossAggro && hud?.status === "explore" && recruited === 0 && (
        <p className="hint">Click or tap the ground to move. Follow the road to the first glowing shrine.</p>
      )}
      {!panel && !hud?.pendingAttackMove && !hud?.bossAggro && recruited > 0 && recruited < 3 && (
        <p className="hint hidden sm:block">Drag a box to select several units. Right-click to command them. Press Controls for hotkeys.</p>
      )}

      {/* Bottom console */}
      <div className="hud-bar absolute inset-x-0 bottom-0 flex items-stretch gap-3 border-t-2 px-2 pb-2 pt-2 sm:px-3">
        {mapInfo && hud && (
          <div className="hidden shrink-0 md:block">
            <Minimap map={mapInfo} state={hud.minimap} onFocus={(x, z) => e()?.focus(x, z)} onOrder={(x, z) => e()?.orderTo(x, z)} />
          </div>
        )}

        <SelectionPanel
          selection={sel}
          warband={hud?.warband ?? []}
          heroHp={hud?.heroHp ?? STATS.hero.hp}
          markedId={hud?.marked?.id ?? null}
          onSelect={(id, add) => e()?.selectUnit(id, add)}
          onHero={() => e()?.selectHero(true)}
        />

        <div className="command-card ml-auto shrink-0" role="toolbar" aria-label="Commands">
          <CommandButton label="Attack" hotkey="A" active={hud?.pendingAttackMove} disabled={!sel.length} onUse={() => e()?.command(hud?.pendingAttackMove ? "cancel" : "attackMove")} hint="Attack-move: walk to a point and fight anything on the way" />
          <CommandButton label="Stop" hotkey="S" disabled={!sel.length} onUse={() => e()?.command("stop")} hint="Stop and stand by" />
          <CommandButton label="Hold" hotkey="H" disabled={!sel.length} onUse={() => e()?.command("hold")} hint="Hold position: fight only what is in range" />
          <CommandButton label="Army" hotkey="`" onUse={() => e()?.selectAll()} hint="Select the whole warband" />
          {(Object.keys(abilities) as AbilityId[]).map((a) => {
            const info = abilities[a];
            const st = hud?.abilities[a];
            const lockedAt = shrines.find((s) => s.id === info.unlock)?.title;
            const badge = a === "drone" && hud?.fallen ? `${hud.fallen}` : a === "kelly" && hud?.kellyLeft ? `${Math.ceil(hud.kellyLeft)}s` : undefined;
            return (
              <CommandButton
                key={a}
                label={info.name}
                hotkey={info.hotkey}
                cd={st?.cd ?? 0}
                max={st?.max ?? 1}
                locked={!st?.unlocked}
                active={a === "kelly" && !!hud?.kellyLeft}
                badge={badge}
                onUse={() => e()?.cast(a)}
                hint={st?.unlocked ? `${info.blurb} From ${info.source}.` : `Unlocks at ${lockedAt}.`}
                ability
              />
            );
          })}
        </div>
      </div>

      {panel && (
        <Dialogue
          panel={panel}
          page={page}
          setPage={setPage}
          onClose={closePanel}
          onRestart={restart}
          onDifficulty={(d) => {
            engineRef.current?.setDifficulty(d);
            setDifficulty(d);
            closePanel();
          }}
          recruited={recruited}
        />
      )}
    </div>
  );
}

function SelectionPanel({
  selection,
  warband,
  heroHp,
  markedId,
  onSelect,
  onHero,
}: {
  selection: UnitInfo[];
  warband: UnitInfo[];
  heroHp: number;
  markedId: number | null;
  onSelect: (id: number, add: boolean) => void;
  onHero: () => void;
}) {
  if (selection.length === 1) {
    const u = selection[0];
    const st = STATS[u.kind];
    return (
      <div className={`flex min-w-0 flex-1 items-center gap-3 ${u.id === markedId ? "marked-panel" : ""}`}>
        <div className="portrait shrink-0" style={{ borderColor: UNIT_COLOR[u.kind], color: UNIT_COLOR[u.kind] }}>
          {UNIT_LABEL[u.kind][0]}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-bone">
            {UNIT_LABEL[u.kind]} <span className="text-xs font-normal text-muted">{ORDER_LABEL[u.order]}</span>
          </p>
          <HpBar hp={u.hp} max={u.max} />
          <p className="mt-1 hidden text-xs text-muted sm:block">
            {st.heal ? `Heals ${st.heal}` : `Damage ${st.dmg}${st.crit ? ", crits" : ""}`}, range {st.range}
          </p>
          <p className="mt-0.5 hidden max-w-md truncate text-xs text-muted lg:block" title={UNIT_ROLE[u.kind]}>
            {UNIT_ROLE[u.kind]}
          </p>
        </div>
      </div>
    );
  }

  const all = [{ id: 0, kind: "hero" as UnitKind, hp: heroHp, max: STATS.hero.hp, order: "idle" as const, selected: false }, ...warband];
  const selectedIds = new Set(selection.map((s) => s.id));
  return (
    <div className="min-w-0 flex-1">
      <p className="mb-1 text-xs text-muted">
        {selection.length ? `${selection.length} selected` : "Nothing selected"}, warband {warband.length} / {shrines.length}
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {all.map((u, i) => {
          const isHero = u.kind === "hero";
          const on = isHero ? selection.some((s) => s.kind === "hero") : selectedIds.has(u.id);
          const dead = u.hp <= 0;
          return (
            <li key={isHero ? "hero" : u.id}>
              <button
                type="button"
                disabled={dead}
                onClick={(ev) => (isHero ? onHero() : onSelect(u.id, ev.shiftKey))}
                title={`${UNIT_LABEL[u.kind]}${dead ? " (fallen)" : ""}`}
                aria-pressed={on}
                className={`unit-slot ${!isHero && u.id === markedId ? "unit-slot-marked" : ""}`}
                style={{ borderColor: on ? "#7cd16b" : UNIT_COLOR[u.kind], opacity: dead ? 0.35 : 1 }}
              >
                <span style={{ color: UNIT_COLOR[u.kind] }}>{UNIT_LABEL[u.kind][0]}</span>
                <span className="absolute inset-x-0 bottom-0 h-1 bg-moss" style={{ width: `${(u.hp / u.max) * 100}%` }} />
              </button>
            </li>
          );
        })}
        {Array.from({ length: shrines.length - warband.length }).map((_, i) => (
          <li key={`empty-${i}`} className="unit-slot unit-slot-empty" title="Not recruited yet" aria-hidden />
        ))}
      </ul>
    </div>
  );
}

function HpBar({ hp, max }: { hp: number; max: number }) {
  return (
    <div className="mt-1 flex items-center gap-2">
      <div className="h-1.5 w-28 overflow-hidden rounded-sm bg-stone-deep">
        <div className="h-full bg-moss" style={{ width: `${(hp / max) * 100}%` }} />
      </div>
      <span className="text-xs text-muted">
        {hp} / {max}
      </span>
    </div>
  );
}

function CommandButton({
  label,
  hotkey,
  onUse,
  hint,
  cd = 0,
  max = 1,
  active = false,
  disabled = false,
  locked = false,
  badge,
  ability = false,
}: {
  label: string;
  hotkey: string;
  onUse: () => void;
  hint: string;
  cd?: number;
  max?: number;
  active?: boolean;
  disabled?: boolean;
  locked?: boolean;
  badge?: string;
  ability?: boolean;
}) {
  const cooling = cd > 0 && !locked;
  return (
    <button
      type="button"
      onClick={onUse}
      disabled={disabled || cooling || locked}
      title={`${hint} (${hotkey})`}
      aria-label={`${label} (${hotkey}): ${hint}${cooling ? `, ready in ${Math.ceil(cd)} seconds` : ""}`}
      aria-pressed={active || undefined}
      className={`ability ${ability ? "ability-hero" : ""} ${active ? (ability ? "ability-buff" : "ability-active") : ""} ${locked ? "ability-locked" : ""}`}
    >
      <span className="px-0.5 text-center text-[11px] font-semibold leading-tight text-bone">{locked ? "Locked" : label}</span>
      <span className="text-[10px] text-muted">{hotkey}</span>
      {badge && <span className="ability-badge">{badge}</span>}
      {cooling && (
        <span className="absolute inset-0 flex items-center justify-center bg-stone-deep/70 text-base font-semibold text-bone">
          <span className="absolute inset-x-0 bottom-0 bg-gold/25" style={{ height: `${(cd / max) * 100}%` }} />
          <span className="relative">{Math.ceil(cd)}</span>
        </span>
      )}
    </button>
  );
}

const CONTROLS: [string, string][] = [
  ["Left-click unit", "Select it (Shift adds or removes)"],
  ["Drag a box", "Select every unit inside"],
  ["Click or right-click ground", "Move the selection there"],
  ["Click the giant", "Attack it"],
  ["A, then click", "Attack-move"],
  ["S / H", "Stop / hold position"],
  ["Q / W / E", "Medical Drone / Checkmate / Kelly Bet"],
  ["Ctrl+1–9, then 1–9", "Save and recall a group (double-tap to center)"],
  ["Ctrl+A or `", "Select the whole warband"],
  ["F1 / Space", "Select Vitaliy / center the camera"],
  ["Arrows, screen edge, middle-drag", "Move the camera"],
  ["Minimap", "Click to look, right-click to send units"],
];

function Dialogue({
  panel,
  page,
  setPage,
  onClose,
  onRestart,
  onDifficulty,
  recruited,
}: {
  panel: NonNullable<Panel>;
  page: number;
  setPage: (n: number) => void;
  onClose: () => void;
  onRestart: () => void;
  onDifficulty: (d: Difficulty) => void;
  recruited: number;
}) {
  let title = "";
  let lines: string[] = [];
  let action = "Continue";
  let extra: React.ReactNode = null;

  if (panel.type === "controls") {
    title = "Controls";
    lines = [""];
    action = "Resume";
    extra = (
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
        {CONTROLS.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="font-semibold text-bone">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    );
  } else if (panel.type === "intro") {
    title = intro.title;
    lines = intro.lines;
    action = "Begin";
    extra = (
      <div className="mt-2 space-y-2">
        <p className="text-xs text-muted">Choose a difficulty. You can&apos;t change it mid-run.</p>
        {(Object.keys(difficulties) as Difficulty[]).map((d) => (
          <button key={d} type="button" className="difficulty" onClick={() => onDifficulty(d)} autoFocus={d === "story"}>
            <span className="font-display font-semibold text-bone">{difficulties[d].label}</span>
            <span className="text-xs">{difficulties[d].blurb}</span>
          </button>
        ))}
      </div>
    );
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
        {(Object.keys(abilities) as AbilityId[])
          .filter((a) => abilities[a].unlock === panel.shrine.id)
          .map((a) => (
            <span key={a} className="mt-2 block">
              <span className="font-semibold text-gold-bright">New ability: {abilities[a].name} ({abilities[a].hotkey}).</span> {abilities[a].blurb}
            </span>
          ))}
      </p>
    );
  } else if (panel.type === "boss") {
    title = boss.name;
    lines = [
      ...boss.intro,
      recruited < 3
        ? `You have ${recruited} of ${shrines.length} recruits. You can retreat south to reset the fight and recruit more.`
        : "Your warband is ready. Ctrl+A selects everyone and A attack-moves.",
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
        {panel.type !== "controls" && (
          <p className="mt-4 min-h-[5.5rem] text-base leading-relaxed text-bone/90" aria-live="polite">
            {lines[page]}
          </p>
        )}
        {last && <div className={panel.type === "controls" ? "mt-4" : ""}>{extra}</div>}
        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-xs text-muted">{panel.type === "controls" ? "" : `${page + 1} / ${lines.length}`}</p>
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
            ) : panel.type === "intro" && last ? null : (
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

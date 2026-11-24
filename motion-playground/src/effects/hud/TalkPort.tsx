/**
 * 口播向小件。运动想法来自 video-talkcraft / video-shotcraft 里能叠在人物上的那几类
 * （划线、词槽、仪表、角框、划词替换、荧光笔）。这里是按 Overlay 的时间轴重写的，
 * 不引用那两个仓库的 Remotion 源码。
 */
import type { CSSProperties, ReactNode } from "react";
import type { EffectDef, EffectProps } from "../types";
import { useCardElapsed } from "./useTimelineTime";
import {
  ACCENT_OPTIONS,
  ACCENT_SWATCH,
  OFFSET_CONTROLS,
  OFFSET_DEFAULTS,
  offsetVars,
  THEME_OPTIONS,
} from "./accent";

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const prog = (t: number, s: number, d: number) => clamp((t - s) / d);
const out = (u: number) => 1 - Math.pow(1 - u, 3);

type Pos = { offsetX?: number; offsetY?: number };

type Clock = { __t?: number; __start?: number; offsetX?: number; offsetY?: number };

type InkParams = Clock & {
  theme: "dark" | "light";
  position: "left" | "right" | "top";
  text: string;
  accent: string;
};

type SlotParams = Clock & {
  theme: "dark" | "light";
  position: "left" | "right" | "top";
  words: string;
  stepMs: number;
  accent: string;
};

type GaugeParams = Clock & {
  theme: "dark" | "light";
  position: "left" | "right";
  value: number;
  max: number;
  unit: string;
  label: string;
  accent: string;
};

type BracketParams = Clock & {
  theme: "dark" | "light";
  position: "left" | "right" | "center";
  label: string;
  accent: string;
};

type StrikeParams = Clock & {
  theme: "dark" | "light";
  position: "left" | "right" | "center";
  before: string;
  after: string;
  accent: string;
};

function Anchor({
  position,
  params,
  children,
  style,
}: {
  position: string;
  params: Pos;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`hud hud-anchor hud-anchor--${position}`}
      style={{ ...offsetVars(params), ...style }}
    >
      {children}
    </div>
  );
}

function InkUnderline({ params, playToken }: EffectProps<InkParams>) {
  const t = useCardElapsed(params, playToken);
  const acc = ACCENT_SWATCH[params.accent] ?? ACCENT_SWATCH.blue;
  const draw = out(prog(t, 0.15, 0.55));
  const fade = 1 - prog(t, 4.2, 0.35);
  return (
    <Anchor position={params.position} params={params}>
      <div style={{ position: "relative", fontWeight: 800, fontSize: 42, letterSpacing: "0.04em", opacity: fade, color: "var(--hud-ink)" }}>
        {params.text}
        <i style={{
          position: "absolute", left: 0, right: 0, bottom: -6, height: 8, borderRadius: 6,
          background: acc, transformOrigin: "0 50%", transform: `scaleX(${draw})`, opacity: 0.9,
        }} />
      </div>
    </Anchor>
  );
}

export const inkUnderlineDef: EffectDef<InkParams> = {
  id: "ink-underline",
  name: "墨迹下划线",
  description: "墨迹下划线 · 关键词下方一条线跟着念画出来",
  tags: ["扫过点亮"],
  selfPosition: true,
  defaults: {
    theme: "dark", position: "left", text: "划这一个词", accent: "orange", ...OFFSET_DEFAULTS,
  },
  controls: [
    { key: "theme", label: "底色(此卡独立生效)", type: "select", options: THEME_OPTIONS },
    { key: "position", label: "落位", type: "select", options: [
      { label: "左侧", value: "left" }, { label: "右侧", value: "right" }, { label: "顶部", value: "top" },
    ] },
    { key: "text", label: "要划线的词", type: "text" },
    { key: "accent", label: "线的颜色", type: "select", options: ACCENT_OPTIONS },
    ...OFFSET_CONTROLS,
  ],
  Component: InkUnderline,
};

function WordSlot({ params, playToken }: EffectProps<SlotParams>) {
  const t = useCardElapsed(params, playToken);
  const words = params.words.split("|").map((s) => s.trim()).filter(Boolean);
  if (!words.length) words.push("");
  const step = Math.max(0.4, (params.stepMs || 900) / 1000);
  const i = Math.min(words.length - 1, Math.floor(t / step));
  const local = t - i * step;
  const acc = ACCENT_SWATCH[params.accent] ?? ACCENT_SWATCH.blue;
  const y = (1 - out(prog(local, 0, 0.28))) * 18;
  const fade = 1 - prog(t, Math.max(step * words.length, 1) + 0.4, 0.3);
  return (
    <Anchor position={params.position} params={params}>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 10, padding: "10px 18px",
        borderRadius: 999, background: "rgba(12,14,18,0.72)", color: "#fff",
        fontWeight: 800, fontSize: 32, opacity: fade, overflow: "hidden",
      }}>
        <i style={{ width: 10, height: 10, borderRadius: 99, background: acc }} />
        <span style={{ display: "inline-block", transform: `translateY(${y}px)` }}>{words[i] || ""}</span>
      </div>
    </Anchor>
  );
}

export const wordSlotDef: EffectDef<SlotParams> = {
  id: "word-slot",
  name: "词槽轮换",
  description: "词槽轮换 · 同一个药丸里按台词换成下一个词",
  tags: ["翻转轮换"],
  selfPosition: true,
  defaults: {
    theme: "dark", position: "top", words: "先看这点|再看这点|最后这点", stepMs: 900, accent: "blue", ...OFFSET_DEFAULTS,
  },
  controls: [
    { key: "theme", label: "底色(此卡独立生效)", type: "select", options: THEME_OPTIONS },
    { key: "position", label: "落位", type: "select", options: [
      { label: "顶部", value: "top" }, { label: "左侧", value: "left" }, { label: "右侧", value: "right" },
    ] },
    { key: "words", label: "词，竖线分隔，念到哪个换哪个", type: "text" },
    { key: "stepMs", label: "每个词停留", type: "range", min: 400, max: 4000, step: 50, unit: "ms" },
    { key: "accent", label: "圆点颜色", type: "select", options: ACCENT_OPTIONS },
    ...OFFSET_CONTROLS,
  ],
  Component: WordSlot,
};

function GaugeMeter({ params, playToken }: EffectProps<GaugeParams>) {
  const t = useCardElapsed(params, playToken);
  const acc = ACCENT_SWATCH[params.accent] ?? ACCENT_SWATCH.blue;
  const max = params.max > 0 ? params.max : 100;
  const ratio = clamp(params.value / max);
  const p = out(prog(t, 0.1, 0.9));
  const ang = -180 + 180 * ratio * p;
  const shown = Math.round(params.value * p);
  const fade = 1 - prog(t, 4.4, 0.35);
  const rad = (ang * Math.PI) / 180;
  const nx = 80 + Math.cos(rad) * 58;
  const ny = 78 + Math.sin(rad) * 58;
  return (
    <Anchor position={params.position} params={params}>
      <div style={{ width: 180, textAlign: "center", opacity: fade, color: "var(--hud-ink)" }}>
        <svg width="160" height="96" viewBox="0 0 160 96">
          <path d="M14 78 A66 66 0 0 1 146 78" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="10" strokeLinecap="round" />
          <path d="M14 78 A66 66 0 0 1 146 78" fill="none" stroke={acc} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={`${Math.PI * 66 * ratio * p} 999`} />
          <line x1="80" y1="78" x2={nx} y2={ny} stroke="var(--hud-ink)" strokeWidth="3" strokeLinecap="round" />
          <circle cx="80" cy="78" r="5" fill={acc} />
        </svg>
        <div style={{ fontWeight: 800, fontSize: 36, marginTop: -8 }}>{shown}{params.unit}</div>
        <div style={{ fontSize: 14, opacity: 0.7 }}>{params.label}</div>
      </div>
    </Anchor>
  );
}

export const gaugeMeterDef: EffectDef<GaugeParams> = {
  id: "gauge-meter",
  name: "仪表读数",
  description: "仪表读数 · 半圆刻度针转到目标数",
  tags: ["滚动计数"],
  selfPosition: true,
  defaults: {
    theme: "dark", position: "right", value: 72, max: 100, unit: "%", label: "完成度", accent: "blue", ...OFFSET_DEFAULTS,
  },
  controls: [
    { key: "theme", label: "底色(此卡独立生效)", type: "select", options: THEME_OPTIONS },
    { key: "position", label: "落位", type: "select", options: [
      { label: "右侧", value: "right" }, { label: "左侧", value: "left" },
    ] },
    { key: "value", label: "读数", type: "range", min: 0, max: 9999, step: 1 },
    { key: "max", label: "满刻度", type: "range", min: 1, max: 9999, step: 1 },
    { key: "unit", label: "单位", type: "text" },
    { key: "label", label: "说明", type: "text" },
    { key: "accent", label: "刻度颜色", type: "select", options: ACCENT_OPTIONS },
    ...OFFSET_CONTROLS,
  ],
  Component: GaugeMeter,
};

function ScanBracket({ params, playToken }: EffectProps<BracketParams>) {
  const t = useCardElapsed(params, playToken);
  const acc = ACCENT_SWATCH[params.accent] ?? ACCENT_SWATCH.blue;
  const close = out(prog(t, 0, 0.45));
  const textIn = out(prog(t, 0.35, 0.3));
  const fade = 1 - prog(t, 4.2, 0.35);
  const inset = 18 * (1 - close);
  const corner = (sx: number, sy: number): CSSProperties => ({
    position: "absolute", width: 18, height: 18, borderColor: acc, borderStyle: "solid", borderWidth: 0,
    ...(sx < 0 ? { left: inset, borderLeftWidth: 3 } : { right: inset, borderRightWidth: 3 }),
    ...(sy < 0 ? { top: inset, borderTopWidth: 3 } : { bottom: inset, borderBottomWidth: 3 }),
  });
  return (
    <Anchor position={params.position} params={params}>
      <div style={{ position: "relative", minWidth: 180, minHeight: 88, padding: "28px 26px", opacity: fade }}>
        <i style={corner(-1, -1)} /><i style={corner(1, -1)} /><i style={corner(-1, 1)} /><i style={corner(1, 1)} />
        <div style={{ fontWeight: 800, fontSize: 28, opacity: textIn, textAlign: "center", color: "var(--hud-ink)" }}>{params.label}</div>
      </div>
    </Anchor>
  );
}

export const scanBracketDef: EffectDef<BracketParams> = {
  id: "scan-bracket",
  name: "扫描角框",
  description: "扫描角框 · 四角收拢，框住这一句",
  tags: ["扫过点亮"],
  selfPosition: true,
  defaults: {
    theme: "dark", position: "right", label: "看这里", accent: "blue", ...OFFSET_DEFAULTS,
  },
  controls: [
    { key: "theme", label: "底色(此卡独立生效)", type: "select", options: THEME_OPTIONS },
    { key: "position", label: "落位", type: "select", options: [
      { label: "右侧", value: "right" }, { label: "左侧", value: "left" }, { label: "居中", value: "center" },
    ] },
    { key: "label", label: "框里的字", type: "text" },
    { key: "accent", label: "框的颜色", type: "select", options: ACCENT_OPTIONS },
    ...OFFSET_CONTROLS,
  ],
  Component: ScanBracket,
};

function StrikeReplace({ params, playToken }: EffectProps<StrikeParams>) {
  const t = useCardElapsed(params, playToken);
  const acc = ACCENT_SWATCH[params.accent] ?? ACCENT_SWATCH.alert;
  const strike = out(prog(t, 0.2, 0.35));
  const rise = out(prog(t, 0.55, 0.35));
  const fade = 1 - prog(t, 4.3, 0.35);
  return (
    <Anchor position={params.position} params={params}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, fontWeight: 800, fontSize: 36, opacity: fade }}>
        <span style={{ position: "relative", color: "rgba(255,255,255,0.55)", display: "inline-block" }}>
          {params.before}
          <i style={{ position: "absolute", left: 0, right: 0, top: "52%", height: 3, background: acc, transformOrigin: "0 50%", transform: `scaleX(${strike})` }} />
        </span>
        <span style={{ color: "var(--hud-ink)", transform: `translateY(${(1 - rise) * 16}px)`, opacity: rise }}>{params.after}</span>
      </div>
    </Anchor>
  );
}

export const strikeReplaceDef: EffectDef<StrikeParams> = {
  id: "strike-replace",
  name: "划词替换",
  description: "划词替换 · 旧说法划掉，新说法从下面顶上来",
  tags: ["对撞并置"],
  selfPosition: true,
  defaults: {
    theme: "dark", position: "left", before: "旧的说法", after: "新的说法", accent: "alert", ...OFFSET_DEFAULTS,
  },
  controls: [
    { key: "theme", label: "底色(此卡独立生效)", type: "select", options: THEME_OPTIONS },
    { key: "position", label: "落位", type: "select", options: [
      { label: "左侧", value: "left" }, { label: "右侧", value: "right" }, { label: "居中", value: "center" },
    ] },
    { key: "before", label: "被划掉的说法", type: "text" },
    { key: "after", label: "换上的说法", type: "text" },
    { key: "accent", label: "划线颜色", type: "select", options: ACCENT_OPTIONS },
    ...OFFSET_CONTROLS,
  ],
  Component: StrikeReplace,
};

function Highlighter({ params, playToken }: EffectProps<InkParams>) {
  const t = useCardElapsed(params, playToken);
  const acc = ACCENT_SWATCH[params.accent] ?? ACCENT_SWATCH.orange;
  const wipe = out(prog(t, 0.12, 0.55));
  const fade = 1 - prog(t, 4.2, 0.35);
  return (
    <Anchor position={params.position} params={params}>
      <span style={{ position: "relative", fontWeight: 800, fontSize: 34, opacity: fade, color: "var(--hud-ink)" }}>
        <i style={{
          position: "absolute", left: -4, top: "18%", bottom: "8%", width: `${wipe * 108}%`,
          background: acc, opacity: 0.45, borderRadius: 4, zIndex: 0,
        }} />
        <span style={{ position: "relative", zIndex: 1 }}>{params.text}</span>
      </span>
    </Anchor>
  );
}

export const highlighterDef: EffectDef<InkParams> = {
  id: "highlighter-sweep",
  name: "荧光笔扫过",
  description: "荧光笔扫过 · 半透明色块从左扫过这一句",
  tags: ["扫过点亮"],
  selfPosition: true,
  defaults: {
    theme: "dark", position: "top", text: "这一句是重点", accent: "orange", ...OFFSET_DEFAULTS,
  },
  controls: [
    { key: "theme", label: "底色(此卡独立生效)", type: "select", options: THEME_OPTIONS },
    { key: "position", label: "落位", type: "select", options: [
      { label: "顶部", value: "top" }, { label: "左侧", value: "left" }, { label: "右侧", value: "right" },
    ] },
    { key: "text", label: "被扫过的句子", type: "text" },
    { key: "accent", label: "笔的颜色", type: "select", options: ACCENT_OPTIONS },
    ...OFFSET_CONTROLS,
  ],
  Component: Highlighter,
};

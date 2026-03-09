import React from "react";
import { motion } from "framer-motion";

/* ═══════════════════════════════════════════════════════════════════════════
   Skeleton — Reusable shimmer loading placeholders
   Theme-aware via CSS variables. Variants for lines, blocks, chat bubbles,
   cards, and bar charts.
   ═══════════════════════════════════════════════════════════════════════════ */

// Shared shimmer keyframes injected once via a <style> tag
const SHIMMER_STYLE_ID = "skeleton-shimmer-style";

function ensureShimmerStyle() {
  if (typeof document === "undefined") return;
  if (document.getElementById(SHIMMER_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = SHIMMER_STYLE_ID;
  style.textContent = `
    @keyframes skeleton-shimmer {
      0% { background-position: -400px 0; }
      100% { background-position: 400px 0; }
    }
  `;
  document.head.appendChild(style);
}

// Base shimmer styles shared by all variants
function shimmerStyle(width, height, extraStyle = {}) {
  ensureShimmerStyle();
  return {
    width: width || "100%",
    height: height || "16px",
    borderRadius: "var(--radius-sm)",
    background: `linear-gradient(
      90deg,
      var(--bg-card) 0%,
      var(--sub-color) 40%,
      var(--bg-card) 80%
    )`,
    backgroundSize: "800px 100%",
    animation: "skeleton-shimmer 1.6s ease-in-out infinite",
    border: "1px solid var(--border-color)",
    ...extraStyle,
  };
}

// Framer Motion fade-in wrapper shared by all variants
const fadeProps = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3 },
};

/**
 * SkeletonLine — A single text-line placeholder.
 * Good for paragraph text, labels, or single-line fields.
 */
export function SkeletonLine({ width = "100%", height = "14px", style = {} }) {
  return (
    <motion.div
      {...fadeProps}
      style={shimmerStyle(width, height, style)}
    />
  );
}

/**
 * SkeletonBlock — A rectangular block placeholder.
 * Good for images, avatars, or arbitrary rectangular areas.
 */
export function SkeletonBlock({ width = "100%", height = "120px", style = {} }) {
  return (
    <motion.div
      {...fadeProps}
      style={shimmerStyle(width, height, {
        borderRadius: "var(--radius-md)",
        ...style,
      })}
    />
  );
}

/**
 * SkeletonChat — A chat-bubble-shaped placeholder.
 * Mimics the WhatsApp/iMessage bubble layout with avatar + bubble lines.
 * Pass `align="right"` for self-sent bubble styling.
 */
export function SkeletonChat({ align = "left", style = {} }) {
  const isRight = align === "right";

  return (
    <motion.div
      {...fadeProps}
      className={`flex items-start gap-2 ${isRight ? "flex-row-reverse" : ""}`}
      style={{
        width: "100%",
        padding: "4px 0",
        ...style,
      }}
    >
      {/* Avatar circle */}
      <div
        style={shimmerStyle("32px", "32px", {
          borderRadius: "var(--radius-full)",
          flexShrink: 0,
        })}
      />
      {/* Bubble body */}
      <div
        className="flex flex-col gap-1.5"
        style={{ maxWidth: "65%", width: "100%" }}
      >
        <div
          style={shimmerStyle("100%", "42px", {
            borderRadius: isRight
              ? "var(--radius-lg) var(--radius-sm) var(--radius-lg) var(--radius-lg)"
              : "var(--radius-sm) var(--radius-lg) var(--radius-lg) var(--radius-lg)",
            background: `linear-gradient(
              90deg,
              ${isRight ? "var(--bubble-self)" : "var(--bg-card)"} 0%,
              var(--sub-color) 40%,
              ${isRight ? "var(--bubble-self)" : "var(--bg-card)"} 80%
            )`,
            backgroundSize: "800px 100%",
            animation: "skeleton-shimmer 1.6s ease-in-out infinite",
            opacity: isRight ? 0.35 : 1,
          })}
        />
        {/* Timestamp line */}
        <div
          style={shimmerStyle(isRight ? "50px" : "60px", "8px", {
            alignSelf: isRight ? "flex-end" : "flex-start",
            opacity: 0.5,
          })}
        />
      </div>
    </motion.div>
  );
}

/**
 * SkeletonCard — A card-shaped placeholder with optional header and body lines.
 * Mimics the project's card pattern with gradient background.
 */
export function SkeletonCard({ width = "100%", height, lines = 3, style = {} }) {
  return (
    <motion.div
      {...fadeProps}
      className="flex flex-col gap-3 p-4"
      style={{
        width,
        height: height || "auto",
        borderRadius: "var(--radius-card-lg)",
        background: "var(--gradient-card)",
        border: "1px solid var(--border-color)",
        ...style,
      }}
    >
      {/* Card header */}
      <div className="flex items-center gap-3">
        <div
          style={shimmerStyle("36px", "36px", {
            borderRadius: "var(--radius-full)",
            flexShrink: 0,
          })}
        />
        <div className="flex flex-col gap-1.5 flex-1">
          <div style={shimmerStyle("45%", "14px")} />
          <div style={shimmerStyle("30%", "10px", { opacity: 0.6 })} />
        </div>
      </div>

      {/* Card body lines */}
      <div className="flex flex-col gap-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            style={shimmerStyle(
              i === lines - 1 ? "60%" : "100%",
              "12px",
              { opacity: 1 - i * 0.1 }
            )}
          />
        ))}
      </div>
    </motion.div>
  );
}

/**
 * SkeletonBar — Bar-chart-shaped placeholder.
 * Renders a row of vertical bars to mimic Recharts bar charts.
 */
export function SkeletonBar({ bars = 7, width = "100%", height = "140px", style = {} }) {
  return (
    <motion.div
      {...fadeProps}
      className="flex items-end justify-between gap-1.5"
      style={{
        width,
        height,
        padding: "8px 0",
        ...style,
      }}
    >
      {Array.from({ length: bars }).map((_, i) => {
        // Pseudo-random heights for visual variety (deterministic based on index)
        const pct = 30 + ((i * 37 + 13) % 60);
        return (
          <div
            key={i}
            className="flex-1"
            style={shimmerStyle("100%", `${pct}%`, {
              borderRadius: "var(--radius-sm) var(--radius-sm) 0 0",
              animationDelay: `${i * 0.08}s`,
            })}
          />
        );
      })}
    </motion.div>
  );
}

// Default export bundles all variants for convenience
export default {
  Line: SkeletonLine,
  Block: SkeletonBlock,
  Chat: SkeletonChat,
  Card: SkeletonCard,
  Bar: SkeletonBar,
};

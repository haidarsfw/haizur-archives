import React from "react";
import { motion } from "framer-motion";

/* ═══════════════════════════════════════════════════════════════════════════
   ErrorState — Reusable themed error/empty-state component
   Shows emoji, title, description, and optional retry button.
   Theme-aware via CSS variables.
   ═══════════════════════════════════════════════════════════════════════════ */

export default function ErrorState({
  emoji = "\u{1F614}",
  title = "Something went wrong",
  description = "",
  onRetry = null,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center"
      style={{
        width: "100%",
        maxWidth: "420px",
        margin: "0 auto",
      }}
    >
      {/* Emoji */}
      <motion.span
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 20 }}
        style={{
          fontSize: "48px",
          lineHeight: 1,
          display: "block",
          marginBottom: "4px",
        }}
      >
        {emoji}
      </motion.span>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "22px",
          fontWeight: 400,
          color: "var(--text-color)",
          margin: 0,
          lineHeight: 1.3,
        }}
      >
        {title}
      </motion.h3>

      {/* Description */}
      {description && (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.3 }}
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "14px",
            color: "var(--text-dim)",
            margin: 0,
            lineHeight: 1.6,
            maxWidth: "340px",
          }}
        >
          {description}
        </motion.p>
      )}

      {/* Retry button */}
      {onRetry && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={onRetry}
          className="mt-2"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
            letterSpacing: "0.03em",
            color: "var(--bg-color)",
            background: "var(--main-color)",
            border: "none",
            borderRadius: "var(--radius-md)",
            padding: "10px 28px",
            cursor: "pointer",
            transition: "background 0.2s ease, box-shadow 0.2s ease",
            boxShadow: "0 2px 8px var(--shadow-color)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = `0 4px 16px var(--shadow-color)`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = `0 2px 8px var(--shadow-color)`;
          }}
        >
          try again
        </motion.button>
      )}
    </motion.div>
  );
}

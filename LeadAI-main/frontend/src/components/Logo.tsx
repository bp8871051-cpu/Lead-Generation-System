"use client";

import React from "react";
import { motion } from "framer-motion";

interface LogoProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

export default function Logo({ size = 36, className = "", animate = true }: LogoProps) {
  const pathVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: { 
      pathLength: 1, 
      opacity: 1,
      transition: { duration: 1, ease: "easeOut" }
    }
  };

  const arrowHeadVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
      transition: { delay: 0.8, type: "spring", stiffness: 300, damping: 20 }
    }
  };

  const barVariants = {
    hidden: { scaleY: 0, opacity: 0 },
    visible: (i: number) => ({
      scaleY: 1,
      opacity: 1,
      transition: { delay: 0.5 + (i * 0.15), duration: 0.4, ease: "backOut" }
    })
  };

  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        initial={animate ? "hidden" : "visible"}
        animate="visible"
      >
        <defs>
          {/* Main L Gradient (Purple to Cyan) */}
          <linearGradient id="l-grad" x1="20" y1="15" x2="85" y2="85" gradientUnits="userSpaceOnUse">
            <stop stopColor="#9333EA" /> {/* Deep Purple */}
            <stop offset="0.4" stopColor="#6366F1" /> {/* Indigo */}
            <stop offset="1" stopColor="#06B6D4" /> {/* Cyan */}
          </linearGradient>

          {/* Cyan Glow for Arrow and Bars */}
          <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. The 'L' Shape */}
        <motion.path
          d="M 22 15 L 22 82 L 85 82"
          stroke="url(#l-grad)"
          strokeWidth="15"
          strokeLinecap="square"
          strokeLinejoin="miter"
          fill="none"
          variants={pathVariants}
        />

        {/* 2. The Swooping Arrow (Growth Curve) */}
        <motion.path
          d="M 25 72 Q 45 60 78 22"
          stroke="#00E5FF"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
          filter="url(#neon-glow)"
          variants={{
            hidden: { pathLength: 0, opacity: 0 },
            visible: { pathLength: 1, opacity: 1, transition: { delay: 0.4, duration: 0.8, ease: "easeOut" } }
          }}
        />
        {/* Arrow Head */}
        <motion.polygon
          points="66 22, 83 17, 78 34"
          fill="#00E5FF"
          filter="url(#neon-glow)"
          variants={arrowHeadVariants}
          style={{ transformOrigin: "78px 22px" }}
        />

        {/* 3. The Bar Chart */}
        {/* Bar 1 */}
        <motion.rect
          x="38"
          y="63"
          width="8"
          height="12"
          fill="#00E5FF"
          rx="1.5"
          filter="url(#neon-glow)"
          custom={0}
          variants={barVariants}
          style={{ transformOrigin: "bottom", transformBox: "fill-box" }}
        />
        {/* Bar 2 */}
        <motion.rect
          x="53"
          y="50"
          width="8"
          height="25"
          fill="#00E5FF"
          rx="1.5"
          filter="url(#neon-glow)"
          custom={1}
          variants={barVariants}
          style={{ transformOrigin: "bottom", transformBox: "fill-box" }}
        />
        {/* Bar 3 */}
        <motion.rect
          x="68"
          y="38"
          width="8"
          height="37"
          fill="#00E5FF"
          rx="1.5"
          filter="url(#neon-glow)"
          custom={2}
          variants={barVariants}
          style={{ transformOrigin: "bottom", transformBox: "fill-box" }}
        />
      </motion.svg>
    </div>
  );
}

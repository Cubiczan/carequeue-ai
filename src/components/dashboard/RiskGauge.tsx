"use client";

import { useEffect, useRef, useState } from "react";
import { RiskLevel, RISK_CONFIG } from "@/lib/metacomp";
import { cn } from "@/lib/utils";

interface RiskGaugeProps {
  level: RiskLevel;
}

export function RiskGauge({ level }: RiskGaugeProps) {
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const config = RISK_CONFIG[level];
  const prevLevelRef = useRef(level);

  useEffect(() => {
    if (prevLevelRef.current !== level) {
      prevLevelRef.current = level;
      const timer = setTimeout(() => {
        setAnimatedPercent(config.percent);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setAnimatedPercent(config.percent);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [level, config.percent]);

  // SVG semicircle gauge parameters
  const radius = 90;
  const strokeWidth = 14;
  const center = 100;
  const circumference = Math.PI * radius; // Half circle
  const dashOffset = circumference - (animatedPercent / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <svg
          width="200"
          height="120"
          viewBox="0 0 200 120"
          className="transform"
        >
          {/* Background arc */}
          <path
            d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="text-slate-700/50"
          />
          {/* Animated arc */}
          <path
            d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
            fill="none"
            stroke={config.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-1000 ease-out"
            style={{
              filter: `drop-shadow(0 0 8px ${config.color}40)`,
            }}
          />
          {/* Center text */}
          <text
            x={center}
            y={center - 15}
            textAnchor="middle"
            className="text-2xl font-bold"
            fill={config.color}
          >
            {level}
          </text>
          <text
            x={center}
            y={center + 8}
            textAnchor="middle"
            className="text-xs"
            fill="#94a3b8"
          >
            RISK LEVEL
          </text>
        </svg>
        {/* Glow effect */}
        <div
          className={cn(
            "absolute inset-0 rounded-full blur-3xl opacity-10 transition-colors duration-1000",
            level === "Low" && "bg-emerald-500",
            level === "Medium" && "bg-amber-500",
            level === "High" && "bg-orange-500",
            level === "Severe" && "bg-red-500"
          )}
        />
      </div>

      {/* Risk level labels */}
      <div className="flex gap-1.5">
        {(["Low", "Medium", "High", "Severe"] as RiskLevel[]).map((l) => (
          <div
            key={l}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border transition-all duration-300",
              l === level
                ? `${RISK_CONFIG[l].bg} ${RISK_CONFIG[l].border} ${RISK_CONFIG[l].text}`
                : "bg-slate-800/30 border-slate-700/30 text-slate-500"
            )}
          >
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

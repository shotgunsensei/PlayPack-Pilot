import React from 'react';
import { motion } from 'framer-motion';

interface ScoreRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

export function ScoreRing({ percentage, size = 120, strokeWidth = 8 }: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const dashoffset = circumference - (percentage / 100) * circumference;

  let color = "text-red-500";
  if (percentage >= 80) color = "text-green-500";
  else if (percentage >= 50) color = "text-yellow-500";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-muted/30"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <motion.circle
          className={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-bold font-display tracking-tighter text-foreground">{percentage}%</span>
      </div>
    </div>
  );
}

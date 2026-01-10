'use client';

import React from 'react';

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  className?: string;
}

export function ProgressRing({
  progress,
  size = 48,
  strokeWidth = 4,
  showLabel = true,
  className = ''
}: ProgressRingProps) {
  const normalizedProgress = Math.min(100, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - normalizedProgress / 100 * circumference;

  return (
    <div id="el-39" className={`relative inline-flex items-center justify-center ${className}`}>
      <svg id="el-40"
      width={size}
      height={size}
      className="transform -rotate-90">

        {/* Background circle */}
        <circle id="el-41"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="hsla(165, 70%, 35%, 0.2)"
        strokeWidth={strokeWidth} />

        {/* Progress circle */}
        <circle id="el-42"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="hsl(165, 100%, 45%)"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-500 ease-out"
        style={{
          filter: normalizedProgress > 0 ? 'drop-shadow(0 0 3px hsla(165, 100%, 45%, 0.5))' : 'none'
        }} />

      </svg>
      {showLabel &&
      <span id="el-43"
      className="absolute text-xs font-medium"
      style={{ color: 'hsl(165, 100%, 75%)' }}>

          {Math.round(normalizedProgress)}%
        </span>
      }
    </div>);

}

// Variant for project cards with domain-colored progress
interface DomainProgressRingProps extends ProgressRingProps {
  color?: string;
}

export function DomainProgressRing({
  progress,
  size = 48,
  strokeWidth = 4,
  showLabel = true,
  color = 'hsl(165, 100%, 45%)',
  className = ''
}: DomainProgressRingProps) {
  const normalizedProgress = Math.min(100, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - normalizedProgress / 100 * circumference;

  return (
    <div id="el-44" className={`relative inline-flex items-center justify-center ${className}`}>
      <svg id="el-45"
      width={size}
      height={size}
      className="transform -rotate-90">

        {/* Background circle */}
        <circle id="el-46"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="hsla(210, 20%, 30%, 0.3)"
        strokeWidth={strokeWidth} />

        {/* Progress circle */}
        <circle id="el-47"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-500 ease-out"
        style={{
          filter: normalizedProgress > 0 ? `drop-shadow(0 0 4px ${color})` : 'none'
        }} />

      </svg>
      {showLabel &&
      <span id="el-48"
      className="absolute text-xs font-bold"
      style={{ color }}>

          {Math.round(normalizedProgress)}%
        </span>
      }
    </div>);

}
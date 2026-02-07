"use client";

import clsx from "clsx";

interface StatCardProps {
  label: string;
  value: string | number;
  color: "green" | "red" | "gray" | "blue";
  subtitle?: string;
}

const colorClasses = {
  green: "bg-green-50 text-green-700",
  red: "bg-red-50 text-red-700",
  gray: "bg-gray-50 text-gray-700",
  blue: "bg-blue-50 text-blue-700",
};

export function StatCard({ label, value, color, subtitle }: StatCardProps) {
  return (
    <div className={clsx("rounded-lg p-3", colorClasses[color])}>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs opacity-75">{label}</div>
      {subtitle && (
        <div className="text-xs font-medium mt-0.5">{subtitle}</div>
      )}
    </div>
  );
}

'use client';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from 'recharts';
import type { DashboardStats } from '@/types';

const RISK_COLORS = ['#16a34a', '#2563eb', '#ca8a04', '#ea580c', '#dc2626'];

export function MonthlyBarChart({ data }: { data: DashboardStats['monthly_counts'] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip formatter={(v) => [`${v}건`, '분석 건수']} />
        <Bar dataKey="count" fill="#0a0a0a" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RiskPieChart({ data }: { data: DashboardStats['risk_distribution'] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={70} label={({ label, percent }: { label?: string; percent?: number }) => `${label ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
          {data.map((entry, i) => (
            <Cell key={entry.level} fill={RISK_COLORS[(entry.level - 1) % RISK_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v, n) => [`${v}건`, n]} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function RiskTrendLine({ data }: { data: { month: string; avg: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v) => [v, '평균 위험도']} />
        <Line type="monotone" dataKey="avg" stroke="#dc2626" strokeWidth={2} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

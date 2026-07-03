import { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import { PieChart, Pie, Legend } from 'recharts';
import type { ReportData } from '@/types';

interface ReportChartProps {
    data: ReportData[];
}

const COLORS = ['#22D3EE', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899', '#06B6D4', '#14B8A6'];

export default function ReportChart({ data }: ReportChartProps) {
    // Sort data so the highest hours are first
    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => b.totalHours - a.totalHours).slice(0, 10); // Show top 10
    }, [data]);

    if (data.length === 0) {
        return null;
    }

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
            <svg style={{ width: 0, height: 0, position: 'absolute' }} aria-hidden="true" focusable="false">
                <defs>
                    <filter id="shadow3d" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.4" />
                        <feComponentTransfer><feFuncA type="linear" slope="0.8" /></feComponentTransfer>
                    </filter>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                    </linearGradient>
                </defs>
            </svg>
            <div className="hud-card rounded-lg p-5 animate-fade-in pointer-events-auto">
                <h3 className="mb-4 font-heading text-lg font-semibold text-text-primary">
                    Horas Trabalhadas Top 10
                </h3>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={sortedData}
                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis
                                dataKey="providerName"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                                tickFormatter={(val) => (val && typeof val === 'string' ? val.split(' ')[0] : String(val || ''))} // Show only first name
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                                tickFormatter={(val) => `${val}h`}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                contentStyle={{
                                    backgroundColor: 'rgba(12,18,34,0.9)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '8px',
                                    color: 'var(--color-text-primary)'
                                }}
                                itemStyle={{ color: 'var(--color-primary)', fontWeight: 600 }}
                                formatter={(value: number) => [`${value.toFixed(1)} h`, 'Horas']}
                            />
                            <Bar
                                dataKey="totalHours"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={40}
                                animationDuration={1500}
                            >
                                {sortedData.map((_, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                        style={{ filter: 'url(#shadow3d)', stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="hud-card rounded-lg p-5 animate-fade-in pointer-events-auto">
                <h3 className="mb-4 font-heading text-lg font-semibold text-text-primary">
                    Distribuição Geral de Horas
                </h3>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={sortedData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={2}
                                dataKey="totalHours"
                                nameKey="providerName"
                                animationDuration={1500}
                                stroke="rgba(255,255,255,0.1)"
                                strokeWidth={2}
                            >
                                {sortedData.map((_, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                        style={{ filter: 'url(#shadow3d)' }}
                                    />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(12,18,34,0.9)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '8px',
                                    color: 'var(--color-text-primary)'
                                }}
                                itemStyle={{ fontWeight: 600 }}
                                formatter={(value: number) => [`${value.toFixed(1)} h`, 'Horas']}
                            />
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                iconType="circle"
                                wrapperStyle={{ fontSize: '12px', color: 'var(--color-text-muted)' }}
                                formatter={(value) => <span style={{ color: 'var(--color-text-secondary)' }}>{(value && typeof value === 'string' ? value.split(' ')[0] : String(value || ''))}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

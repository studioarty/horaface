import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import type { TimeRecord } from '@/types';

interface WeeklyChartProps {
    records: TimeRecord[];
}

export default function WeeklyChart({ records }: WeeklyChartProps) {
    const chartData = useMemo(() => {
        // Generate last 7 days including today
        const data = [];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayName = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');

            // Count records for this day (check-ins)
            const count = records.filter(r => r.date === dateStr).length;

            data.push({
                name: dayName.charAt(0).toUpperCase() + dayName.slice(1),
                registros: count,
                date: dateStr,
            });
        }
        return data;
    }, [records]);

    return (
        <div className="hud-card rounded-lg p-5 animate-fade-up">
            <div className="mb-4 flex items-center gap-2">
                <BarChart3 style={{ width: 20, height: 20, color: "var(--color-primary)" }} />
                <h3 style={{ fontFamily: "Rajdhani, system-ui, sans-serif", fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)" }}>
                    Frequência Semanal (Acessos)
                </h3>
            </div>

            <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                            allowDecimals={false}
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
                            labelStyle={{ color: 'var(--color-text-secondary)', marginBottom: '4px' }}
                        />
                        <Bar
                            dataKey="registros"
                            name="Registros"
                            fill="var(--color-primary)"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={40}
                            animationDuration={1500}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

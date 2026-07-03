import React from 'react';
import ReportTable from '@/components/features/ReportTable';
import ReportChart from '@/components/features/ReportChart';
import type { ReportData } from '@/types';
import type { TimeRecord } from '@/types';

interface TabTimeBankProps {
    summaryData: ReportData[];
    filteredRecords: TimeRecord[];
}

export function TabTimeBank({ summaryData, filteredRecords }: TabTimeBankProps) {
    return (
        <div className="space-y-6 bg-base mt-2">
            {/* Animated Charts Component */}
            <ReportChart data={summaryData} />

            {/* Per-Provider Summary */}
            {summaryData.length > 0 && (
                <div className="hud-card mb-4 sm:mb-6 rounded-lg p-4 sm:p-5">
                    <h3 className="mb-4 font-heading text-base sm:text-lg font-semibold text-text-primary">
                        Resumo Extrato por Técnico
                    </h3>
                    <div className="space-y-3">
                        {summaryData.map((data) => (
                            <div
                                key={data.providerId}
                                className="flex items-center justify-between rounded-lg bg-elevated/50 px-3 sm:px-4 py-3"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-text-primary truncate">
                                        {data.providerName}
                                    </p>
                                    <p className="text-xs text-text-muted">
                                        {data.totalDays} dia(s) trabalhado(s)
                                    </p>
                                </div>
                                <div className="text-right shrink-0 ml-3">
                                    <p className="font-mono text-sm font-semibold tabular-nums text-primary">
                                        {data.totalHours.toFixed(1)}h
                                    </p>
                                    <p className="font-mono text-xs tabular-nums text-text-muted">
                                        ~{data.avgHoursPerDay.toFixed(1)}h/dia real
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Records Table */}
            <div className="hud-card rounded-lg p-4 sm:p-5">
                <h3 className="mb-4 font-heading text-base sm:text-lg font-semibold text-text-primary">
                    Linha do Tempo do Prestador
                </h3>
                <ReportTable records={filteredRecords} />
            </div>
        </div>
    );
}

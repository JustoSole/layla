import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { useFilters, type Period } from '../contexts/FilterContext';

interface FilterBarProps {
  showSourceFilter?: boolean;
  className?: string;
}

const FilterBar: React.FC<FilterBarProps> = ({ showSourceFilter = true, className = '' }) => {
  const { 
    selectedPeriod, 
    setSelectedPeriod, 
    customRange, 
    setCustomRange,
    selectedSource,
    setSelectedSource
  } = useFilters();
  
  const formatYMD = (d: Date) => d.toISOString().slice(0, 10);
  const [draftFrom, setDraftFrom] = useState(customRange.from);
  const [draftTo, setDraftTo] = useState(customRange.to);
  
  // Sincronizar drafts cuando cambia customRange desde otro lugar
  useEffect(() => {
    if (selectedPeriod === 'custom') {
      setDraftFrom(customRange.from);
      setDraftTo(customRange.to);
    }
  }, [selectedPeriod, customRange]);
  
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Controles principales */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Período */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span>Período:</span>
          </div>
          <div className="flex flex-wrap gap-2 rounded-lg bg-gray-100 p-1 sm:flex-nowrap sm:gap-1">
            {(['3m', '6m', '12m', 'global', 'custom'] as Period[]).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`min-w-[3.5rem] rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                  selectedPeriod === period
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-white hover:text-gray-900'
                }`}
              >
                {period === 'global' ? 'Global' : period === 'custom' ? 'Pers.' : period.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        
        {/* Fuente */}
        {showSourceFilter && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
              <span>Fuente:</span>
            </div>
            <div className="flex flex-wrap gap-2 rounded-lg bg-gray-100 p-1 sm:flex-nowrap sm:gap-1">
              {(['combined','google','tripadvisor'] as const).map((src) => (
                <button
                  key={src}
                  onClick={() => setSelectedSource(src)}
                  className={`min-w-[3.5rem] rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                    selectedSource === src 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-gray-600 hover:bg-white hover:text-gray-900'
                  }`}
                >
                  {src === 'combined' ? 'Todas' : src === 'google' ? 'Google' : 'TripAdvisor'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Controles de rango personalizado */}
      {selectedPeriod === 'custom' && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-600">Desde</label>
              <input
                type="date"
                value={draftFrom}
                onChange={(e) => setDraftFrom(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                aria-label="Seleccionar fecha de inicio"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-600">Hasta</label>
              <input
                type="date"
                value={draftTo}
                onChange={(e) => setDraftTo(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                aria-label="Seleccionar fecha de fin"
              />
            </div>
            <div className="flex gap-2">
              {(() => {
                const isValid = draftFrom <= draftTo;
                return (
                  <>
                    <button
                      onClick={() => isValid && setCustomRange({ from: draftFrom, to: draftTo })}
                      disabled={!isValid}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                        isValid 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'cursor-not-allowed bg-gray-200 text-gray-400'
                      }`}
                    >
                      Aplicar
                    </button>
                    <button
                      onClick={() => {
                        const now = new Date();
                        const to = formatYMD(now);
                        const fromDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
                        const from = formatYMD(fromDate);
                        setDraftFrom(from);
                        setDraftTo(to);
                        setCustomRange({ from, to });
                      }}
                      className="rounded-md border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-white"
                    >
                      Restablecer
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterBar;


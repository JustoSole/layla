import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Period = '3m' | '6m' | '12m' | 'global' | 'custom';
export type Source = 'combined' | 'google' | 'tripadvisor';

interface CustomRange {
  from: string;
  to: string;
}

interface FilterContextType {
  // Period filters
  selectedPeriod: Period;
  setSelectedPeriod: (period: Period) => void;
  customRange: CustomRange;
  setCustomRange: (range: CustomRange) => void;
  
  // Source filters
  selectedSource: Source;
  setSelectedSource: (source: Source) => void;
  
  // Helper to get date range
  getDateRange: () => { from: string; to: string };
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const useFilters = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
};

interface FilterProviderProps {
  children: ReactNode;
}

export const FilterProvider: React.FC<FilterProviderProps> = ({ children }) => {
  const formatYMD = (d: Date) => d.toISOString().slice(0, 10);
  
  // Inicializar con valores guardados o defaults
  const [selectedPeriod, setSelectedPeriodState] = useState<Period>(() => {
    try {
      const saved = localStorage.getItem('global:selectedPeriod') as Period | null;
      if (saved && ['3m','6m','12m','global','custom'].includes(saved)) {
        return saved;
      }
    } catch {}
    return '6m';
  });
  
  const [customRange, setCustomRangeState] = useState<CustomRange>(() => {
    try {
      const saved = localStorage.getItem('global:customRange');
      if (saved) {
        const parsed = JSON.parse(saved) as { from?: string; to?: string };
        if (parsed?.from && parsed?.to) {
          const from = new Date(parsed.from);
          const to = new Date(parsed.to);
          if (!isNaN(from.getTime()) && !isNaN(to.getTime()) && from <= to) {
            return { from: parsed.from, to: parsed.to };
          }
        }
      }
    } catch {}
    const now = new Date();
    const to = formatYMD(now);
    const fromDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const from = formatYMD(fromDate);
    return { from, to };
  });
  
  const [selectedSource, setSelectedSourceState] = useState<Source>(() => {
    try {
      const saved = localStorage.getItem('global:selectedSource') as Source | null;
      if (saved && ['combined','google','tripadvisor'].includes(saved)) {
        return saved;
      }
    } catch {}
    return 'combined';
  });
  
  // Guardar en localStorage cuando cambian
  useEffect(() => {
    try { localStorage.setItem('global:selectedPeriod', selectedPeriod); } catch {}
  }, [selectedPeriod]);
  
  useEffect(() => {
    try { localStorage.setItem('global:customRange', JSON.stringify(customRange)); } catch {}
  }, [customRange]);
  
  useEffect(() => {
    try { localStorage.setItem('global:selectedSource', selectedSource); } catch {}
  }, [selectedSource]);
  
  const setSelectedPeriod = (period: Period) => {
    setSelectedPeriodState(period);
  };
  
  const setCustomRange = (range: CustomRange) => {
    setCustomRangeState(range);
  };
  
  const setSelectedSource = (source: Source) => {
    setSelectedSourceState(source);
  };
  
  const getDateRange = (): { from: string; to: string } => {
    const now = new Date();
    let fromDate: Date;
    
    if (selectedPeriod === 'global' || selectedPeriod === '12m') {
      fromDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    } else if (selectedPeriod === '6m') {
      fromDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    } else if (selectedPeriod === '3m') {
      fromDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    } else {
      // custom
      return customRange;
    }
    
    return {
      from: formatYMD(fromDate),
      to: formatYMD(now)
    };
  };
  
  const value: FilterContextType = {
    selectedPeriod,
    setSelectedPeriod,
    customRange,
    setCustomRange,
    selectedSource,
    setSelectedSource,
    getDateRange
  };
  
  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
};


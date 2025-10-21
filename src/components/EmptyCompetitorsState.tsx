import React from 'react';
import { Users, Plus } from 'lucide-react';

type EmptyCompetitorsStateProps = {
  onAddClick: () => void;
  title?: string;
  subtitle?: string;
  progress?: { current: number; total: number };
};

const EmptyCompetitorsState: React.FC<EmptyCompetitorsStateProps> = ({
  onAddClick,
  title = 'Aún no agregaste competidores',
  subtitle = 'Compará tu reputación, detectá brechas y fijá metas para superar al líder local.',
  progress
}) => {
  return (
    <div className="border border-dashed border-gray-300 rounded-xl p-6 bg-white flex items-center gap-4">
      <div className="h-12 w-12 rounded-lg bg-purple-50 flex items-center justify-center">
        <Users className="h-6 w-6 text-purple-600" />
      </div>
      <div className="flex-1">
        <p className="text-lg font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-600">{subtitle}</p>
        {progress && (
          <p className="mt-1 text-xs text-gray-500">Progreso: {progress.current}/{progress.total}</p>
        )}
      </div>
      <button
        onClick={onAddClick}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700"
      >
        <Plus className="h-4 w-4" />
        Agregar competidores
      </button>
    </div>
  );
};

export default EmptyCompetitorsState;



import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Zap, Target, MessageSquare, AlertTriangle } from 'lucide-react';
import type { AspectDeepAnalysis, SubTopic } from '../utils/gapAnalysis';

interface AspectDeepDiveProps {
  analyses: AspectDeepAnalysis[];
}

const AspectDeepDive: React.FC<AspectDeepDiveProps> = ({ analyses }) => {
  const navigate = useNavigate();
  const [selectedAspect, setSelectedAspect] = useState(0);

  if (analyses.length === 0) {
    return (
      <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
        <div className="text-center py-8">
          <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-600">
            No hay suficientes datos de aspectos analizados aún.
          </p>
          <button 
            onClick={() => navigate('/reviews')}
            className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Ir a reseñas →
          </button>
        </div>
      </section>
    );
  }

  const currentAnalysis = analyses[selectedAspect];

  const getPriorityIcon = (priority: SubTopic['priority']) => {
    switch (priority) {
      case 'strength':
        return <TrendingUp className="h-4 w-4 text-emerald-600" />;
      case 'quick_win':
        return <Zap className="h-4 w-4 text-amber-600" />;
      case 'mixed':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getPriorityColor = (priority: SubTopic['priority']) => {
    switch (priority) {
      case 'strength':
        return 'border-emerald-200 bg-emerald-50/50';
      case 'quick_win':
        return 'border-amber-200 bg-amber-50/50';
      case 'mixed':
        return 'border-yellow-200 bg-yellow-50/50';
      default:
        return 'border-gray-200 bg-gray-50/50';
    }
  };

  const getSentimentBar = (percentage: number) => {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${
              percentage >= 70 ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' :
              percentage >= 40 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
              'bg-gradient-to-r from-red-400 to-red-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className={`text-xs font-bold tabular-nums ${
          percentage >= 70 ? 'text-emerald-600' :
          percentage >= 40 ? 'text-amber-600' :
          'text-red-600'
        }`}>
          {percentage.toFixed(0)}%
        </span>
      </div>
    );
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Análisis Profundo de Temas</h2>
        <p className="text-sm text-gray-600">¿De qué específicamente hablan tus clientes?</p>
      </div>

      {/* Tabs de aspectos - limpios */}
      <div className="mb-5 overflow-x-auto -mx-5 px-5 scrollbar-hide">
        <div className="flex gap-2 min-w-max pb-2">
          {analyses.map((analysis, idx) => {
            const isSelected = selectedAspect === idx;
            const hasQuickWins = analysis.subTopics.some(st => st.priority === 'quick_win');
            const sentiment = analysis.positivePercentage;
            
            return (
              <button
                key={analysis.aspect}
                onClick={() => setSelectedAspect(idx)}
                className={`group relative px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {/* Quick Win indicator */}
                {hasQuickWins && !isSelected && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full"></span>
                )}
                
                <div className="flex items-center gap-2">
                  <span>{analysis.aspect}</span>
                  <span className={`text-xs ${
                    isSelected ? 'text-blue-200' : 'text-gray-500'
                  }`}>
                    ({analysis.totalMentions})
                  </span>
                </div>
                
                {/* Mini sentiment indicator */}
                {!isSelected && (
                  <div className="mt-1.5 h-0.5 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${
                        sentiment >= 70 ? 'bg-emerald-500' :
                        sentiment >= 40 ? 'bg-amber-400' :
                        'bg-red-400'
                      }`}
                      style={{ width: `${sentiment}%` }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Snapshot del aspecto seleccionado - simplificado */}
      <div className="mb-5 p-4 rounded-lg bg-gray-50 border border-gray-200">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="text-sm text-gray-700 mb-2">
              <span className="font-semibold text-gray-900">{currentAnalysis.totalMentions} menciones</span> en reviews
            </div>
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className="px-2 py-1 rounded bg-white border border-gray-200 text-gray-700 font-medium">
                {currentAnalysis.positivePercentage.toFixed(0)}% positivas
              </span>
              {currentAnalysis.negativePercentage > 0 && (
                <span className="px-2 py-1 rounded bg-white border border-gray-200 text-gray-700 font-medium">
                  {currentAnalysis.negativePercentage.toFixed(0)}% negativas
                </span>
              )}
              {currentAnalysis.subTopics.filter(st => st.priority === 'quick_win').length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-50 border border-amber-200 text-amber-700 font-medium">
                  <Zap className="h-3 w-3" />
                  {currentAnalysis.subTopics.filter(st => st.priority === 'quick_win').length} Quick Wins
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate(`/reviews?aspect=${encodeURIComponent(currentAnalysis.aspect)}`)}
            className="flex-shrink-0 text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Ver todas →
          </button>
        </div>
      </div>

      {/* Sub-temas */}
      {currentAnalysis.hasEnoughData && currentAnalysis.subTopics.length > 0 ? (
        <div key={currentAnalysis.aspect} className="space-y-4 animate-fadeIn">
          <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
            🔍 Temas recurrentes detectados ({currentAnalysis.subTopics.length})
          </div>
          
          {currentAnalysis.subTopics.map((subTopic, idx) => (
            <div 
              key={subTopic.name}
              className={`rounded-lg border p-4 bg-white hover:shadow-md transition-all ${
                subTopic.priority === 'quick_win' ? 'border-amber-200' :
                subTopic.priority === 'strength' ? 'border-emerald-200' :
                'border-gray-200'
              }`}
            >
              {/* Header del sub-tema */}
              <div className="flex items-start gap-3 mb-3">
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                  subTopic.priority === 'strength'
                    ? 'bg-emerald-100 text-emerald-700'
                    : subTopic.priority === 'quick_win'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {idx + 1}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-sm font-bold text-gray-900">{subTopic.name}</h3>
                    <button
                      onClick={() => {
                        // Navegar usando el aspecto principal y el nombre del subtema
                        navigate(`/reviews?aspect=${encodeURIComponent(currentAnalysis.aspect)}&subaspect=${encodeURIComponent(subTopic.name)}`);
                      }}
                      className="flex-shrink-0 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
                    >
                      Ver {subTopic.count} →
                    </button>
                  </div>
                  
                  <div className="mb-2.5">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1.5">
                      <span className="font-medium">{subTopic.count} menciones</span>
                      <span className="text-[10px] uppercase tracking-wide font-semibold text-gray-500">Sentimiento</span>
                    </div>
                    {getSentimentBar(subTopic.positivePercentage)}
                  </div>
                  
                  {/* Insight simplificado */}
                  {subTopic.insight && (
                    <div className={`rounded-lg text-xs p-3 border ${
                      subTopic.priority === 'strength' 
                        ? 'bg-emerald-50 border-emerald-200'
                        : subTopic.priority === 'quick_win'
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-start gap-2">
                        <Target className={`h-3.5 w-3.5 flex-shrink-0 mt-0.5 ${
                          subTopic.priority === 'strength'
                            ? 'text-emerald-600'
                            : subTopic.priority === 'quick_win'
                            ? 'text-amber-600'
                            : 'text-gray-600'
                        }`} />
                        <div className="flex-1">
                          <div className={`text-[10px] uppercase tracking-wider font-semibold mb-1 ${
                            subTopic.priority === 'strength'
                              ? 'text-emerald-700'
                              : subTopic.priority === 'quick_win'
                              ? 'text-amber-700'
                              : 'text-gray-700'
                          }`}>
                            {subTopic.priority === 'strength' ? 'Fortaleza' : subTopic.priority === 'quick_win' ? 'Quick Win' : 'Oportunidad'}
                          </div>
                          <span className="text-gray-800 font-medium leading-relaxed">
                            {subTopic.insight}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Citas - más limpias */}
              <div className="space-y-3 ml-11">
                {/* Citas positivas */}
                {subTopic.topPositiveCitations.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                      <div className="text-xs font-semibold text-gray-700">Lo que dicen (positivo)</div>
                    </div>
                    <div className="space-y-1.5">
                      {subTopic.topPositiveCitations.map((citation, citIdx) => (
                        <div 
                          key={citIdx}
                          className="text-xs text-gray-700 pl-3 py-1 border-l-2 border-emerald-400 italic leading-relaxed"
                        >
                          "{citation}"
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Citas negativas */}
                {subTopic.topNegativeCitations.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                      <div className="text-xs font-semibold text-gray-700">Lo que dicen (negativo)</div>
                    </div>
                    <div className="space-y-1.5">
                      {subTopic.topNegativeCitations.map((citation, citIdx) => (
                        <div 
                          key={citIdx}
                          className="text-xs text-gray-700 pl-3 py-1 border-l-2 border-red-400 italic leading-relaxed"
                        >
                          "{citation}"
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                Pocas menciones de {currentAnalysis.aspect.toLowerCase()}
              </p>
              <p className="text-xs text-gray-600">
                Solo {currentAnalysis.totalMentions} menciones. Necesitamos al menos 5 para detectar patrones.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default AspectDeepDive;


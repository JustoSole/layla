import React, { useState, useEffect } from 'react';
import { Users, Plus, TrendingUp, MessageSquare, Star, Loader2 } from 'lucide-react';
import { useBusinessContext } from '../contexts/BusinessContext';
import { businessService, StaffMember, StaffMentionDetail } from '../services/api';
import { mockStaffMembers, getMockStaffMentions } from '../mocks';
import { DEMO_MODE, MOCK_NETWORK_DELAY } from '../config/demo';

const StaffDashboard: React.FC = () => {
  const { currentBusiness } = useBusinessContext();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [showMentionsModal, setShowMentionsModal] = useState(false);
  const [staffMentions, setStaffMentions] = useState<StaffMentionDetail[]>([]);
  const [loadingMentions, setLoadingMentions] = useState(false);

  // Cargar staff data
  useEffect(() => {
    const loadStaff = async () => {
      if (!currentBusiness?.external_place_id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // 🎬 MODO DEMO: Usar mock data
        if (DEMO_MODE.staff) {
          await new Promise(resolve => setTimeout(resolve, MOCK_NETWORK_DELAY));
          setStaff(mockStaffMembers);
          console.log(`✅ Loaded ${mockStaffMembers.length} MOCK staff members`);
          setLoading(false);
          return;
        }
        
        const response = await businessService.listStaff(currentBusiness.external_place_id);
        
        if (response.ok) {
          setStaff(response.staff);
        } else {
          setError(response.error || 'Error cargando staff');
        }
      } catch (err) {
        console.error('Error loading staff:', err);
        setError(err instanceof Error ? err.message : 'Error cargando staff');
      } finally {
        setLoading(false);
      }
    };

    loadStaff();
  }, [currentBusiness?.external_place_id]);

  // Cargar menciones cuando se selecciona un staff member
  useEffect(() => {
    const loadMentions = async () => {
      if (!selectedStaff || !showMentionsModal) return;

      try {
        setLoadingMentions(true);
        
        // 🎬 MODO DEMO: Usar mock data
        if (DEMO_MODE.staff) {
          await new Promise(resolve => setTimeout(resolve, 400));
          const mentions = getMockStaffMentions(selectedStaff.staff_member_id);
          setStaffMentions(mentions);
          console.log(`✅ Loaded ${mentions.length} MOCK mentions for ${selectedStaff.name}`);
          setLoadingMentions(false);
          return;
        }
        
        const response = await businessService.getStaffDetail(selectedStaff.staff_member_id);
        
        if (response.ok) {
          setStaffMentions(response.mentions);
        } else {
          console.error('Error loading mentions:', response.error);
          setStaffMentions([]);
        }
      } catch (err) {
        console.error('Error loading mentions:', err);
        setStaffMentions([]);
      } finally {
        setLoadingMentions(false);
      }
    };

    loadMentions();
  }, [selectedStaff, showMentionsModal]);

  const totalMentions = staff.reduce((sum, s) => sum + s.total_mentions, 0);
  const totalPositive = staff.reduce((sum, s) => sum + s.positive_mentions, 0);
  const avgPositiveRate = staff.length > 0 
    ? Math.round(staff.reduce((sum, s) => sum + s.positive_rate, 0) / staff.length)
    : 0;

  const topPerformers = [...staff]
    .sort((a, b) => b.positive_rate - a.positive_rate)
    .slice(0, 3);

  const needsAttention = staff.filter(s => s.positive_rate < 60);

  const getPerformanceColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-50 text-green-700 border-green-200';
    if (rate >= 60) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    return 'bg-red-50 text-red-700 border-red-200';
  };

  const getPerformanceLabel = (rate: number) => {
    if (rate >= 80) return 'Excelente';
    if (rate >= 60) return 'Bueno';
    return 'Necesita apoyo';
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        <span className="ml-3 text-gray-600">Cargando staff...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700 font-semibold mb-2">Error cargando staff</p>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  // Empty state
  if (staff.length === 0) {
    return (
      <div className="text-center py-20">
        <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          No hay menciones de staff detectadas
        </h2>
        <p className="text-gray-600 mb-6">
          A medida que analices más reviews, detectaremos automáticamente<br />
          las menciones de tu personal.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Desempeño del Equipo</h1>
          <p className="text-sm text-gray-600 mt-1">
            Menciones y sentiment de tu personal en las reseñas (detección automática)
          </p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Miembros Activos</span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{staff.length}</div>
          <div className="text-xs text-gray-500 mt-1">En el equipo</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Menciones</span>
            <MessageSquare className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{totalMentions}</div>
          <div className="text-xs text-green-600 mt-1">+12 vs mes pasado</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Positivas</span>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{totalPositive}</div>
          <div className="text-xs text-gray-500 mt-1">{avgPositiveRate}% promedio</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Tasa Positiva</span>
            <Star className="h-4 w-4 text-yellow-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{avgPositiveRate}%</div>
          <div className="text-xs text-green-600 mt-1">+3% vs mes pasado</div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🏆</span>
          <h2 className="text-lg font-semibold text-gray-900">Top Performers (Este Mes)</h2>
        </div>
        <div className="space-y-2">
          {topPerformers.map((member, idx) => (
            <div key={member.staff_member_id} className="flex items-center gap-3 bg-white rounded-lg p-3 shadow-sm">
              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-white font-bold">
                {idx + 1}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">{member.name}</div>
                <div className="text-xs text-gray-600">{member.role || 'Sin rol específico'}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">{member.total_mentions} menciones</div>
                <div className="text-xs text-green-600">{member.positive_rate}% positivas</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Needs Attention */}
      {needsAttention.length > 0 && (
        <div className="bg-orange-50 rounded-xl border border-orange-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">⚠️</span>
            <h2 className="text-lg font-semibold text-gray-900">Requieren Atención</h2>
          </div>
          <div className="space-y-3">
            {needsAttention.map((member) => (
              <div key={member.staff_member_id} className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold text-gray-900">{member.name}</div>
                    <div className="text-sm text-gray-600">{member.role || 'Sin rol específico'}</div>
                  </div>
                  <span className="text-sm font-semibold text-red-600">{member.positive_rate}% positivo</span>
                </div>
                <p className="text-sm text-gray-700 mb-2">
                  {member.total_mentions} menciones • {member.negative_mentions} negativas
                </p>
                <button
                  onClick={() => {
                    setSelectedStaff(member);
                    setShowMentionsModal(true);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Ver detalles →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Staff Grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Todo el Equipo</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staff.map((member) => (
            <div
              key={member.staff_member_id}
              className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{member.name}</h3>
                  <p className="text-sm text-gray-600">{member.role || 'Sin rol específico'}</p>
                  {member.name_variations && member.name_variations.length > 1 && (
                    <p className="text-xs text-gray-500 mt-1">
                      También: {member.name_variations.slice(0, 2).join(', ')}
                    </p>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Menciones</span>
                  <span className="font-semibold text-gray-900">{member.total_mentions}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Tasa positiva</span>
                  <span className={`text-sm font-semibold px-2 py-1 rounded border ${getPerformanceColor(member.positive_rate)}`}>
                    {member.positive_rate}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="pt-2">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>👍 {member.positive_mentions}</span>
                    <span className="text-gray-400">😐 {member.neutral_mentions}</span>
                    <span>👎 {member.negative_mentions}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${member.positive_rate}%` }}
                    />
                  </div>
                </div>

                {/* Last mention */}
                <p className="text-xs text-gray-500 pt-2">
                  Última mención: {new Date(member.last_mention_date).toLocaleDateString('es-ES')}
                </p>
              </div>

              {/* Actions */}
              <button
                onClick={() => {
                  setSelectedStaff(member);
                  setShowMentionsModal(true);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Ver menciones
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Mentions Modal */}
      {showMentionsModal && selectedStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold">Menciones de {selectedStaff.name}</h2>
                <p className="text-sm text-gray-600">{selectedStaff.role || 'Sin rol específico'}</p>
                <div className="mt-2 flex gap-4 text-sm">
                  <span className="text-green-600">✓ {selectedStaff.positive_mentions} positivas</span>
                  <span className="text-gray-500">○ {selectedStaff.neutral_mentions} neutrales</span>
                  <span className="text-red-600">✗ {selectedStaff.negative_mentions} negativas</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowMentionsModal(false);
                  setSelectedStaff(null);
                  setStaffMentions([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>

            {loadingMentions ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                <span className="ml-2 text-gray-600">Cargando menciones...</span>
              </div>
            ) : staffMentions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No se encontraron menciones
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {staffMentions.map((mention) => {
                    const sentimentColors = {
                      positive: 'bg-green-50 border-green-200',
                      neutral: 'bg-gray-50 border-gray-200',
                      negative: 'bg-red-50 border-red-200'
                    };
                    const sentimentLabels = {
                      positive: { label: 'Positivo', color: 'bg-green-100 text-green-700' },
                      neutral: { label: 'Neutral', color: 'bg-gray-100 text-gray-700' },
                      negative: { label: 'Negativo', color: 'bg-red-100 text-red-700' }
                    };
                    const sentiment = mention.sentiment as 'positive' | 'neutral' | 'negative';
                    const stars = mention.rating_value ? '⭐'.repeat(Math.round(mention.rating_value)) : '';
                    const providerLabel = mention.provider === 'google' ? 'Google' : 'TripAdvisor';
                    const dateStr = mention.posted_at 
                      ? new Date(mention.posted_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                      : 'Fecha desconocida';

                    return (
                      <div key={mention.id} className={`border rounded-lg p-4 ${sentimentColors[sentiment]}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {stars && <span className="text-sm">{stars}</span>}
                            <span className="text-sm text-gray-600">
                              {providerLabel} • {dateStr}
                            </span>
                          </div>
                          {mention.review_url && (
                            <a 
                              href={mention.review_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-700"
                            >
                              Ver completa ↗
                            </a>
                          )}
                        </div>
                        
                        {mention.author_name && (
                          <p className="text-xs text-gray-500 mb-2">Por: {mention.author_name}</p>
                        )}

                        <p className="text-sm text-gray-800 p-3 rounded bg-white/50">
                          "{mention.evidence_span}"
                        </p>
                        
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          <span className={`px-2 py-1 rounded ${sentimentLabels[sentiment].color}`}>
                            {sentimentLabels[sentiment].label}
                          </span>
                          {mention.detected_name && (
                            <span className="text-gray-600">Detectado como: {mention.detected_name}</span>
                          )}
                          {mention.role && (
                            <span className="text-gray-600">• {mention.role}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200 text-sm text-gray-600">
                  Mostrando {staffMentions.length} de {selectedStaff.total_mentions} menciones
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;


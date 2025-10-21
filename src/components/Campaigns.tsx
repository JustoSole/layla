import React, { useState, useEffect } from 'react';
import { QrCode, Plus, Pause, Play, Copy, ExternalLink, TrendingUp, MessageSquare, ArrowUpRight, CheckCircle, X, Star, Download } from 'lucide-react';
import { useBusinessContext } from '../contexts/BusinessContext';
import { Campaign } from '../types/schema';
import { loadCampaigns, loadCampaignFeedback, updateFeedbackResolution } from '../lib/dataLayer';
import { campaignService } from '../services/api';
import { mockCampaigns, mockFeedbackItems } from '../mocks';
import { DEMO_MODE, MOCK_NETWORK_DELAY } from '../config/demo';

const Campaigns: React.FC = () => {
  const { currentBusiness } = useBusinessContext();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [feedbackItems, setFeedbackItems] = useState<any[]>([]);
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'pending' | 'resolved' | 'critical'>('all');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  
  // Create campaign form
  const [campaignName, setCampaignName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCampaign, setQRCampaign] = useState<Campaign | null>(null);

  // Load campaigns on mount
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        // 🎬 MODO DEMO: Usar mock data (funciona sin currentBusiness)
        if (DEMO_MODE.campaigns) {
          await new Promise(resolve => setTimeout(resolve, MOCK_NETWORK_DELAY));
          setCampaigns(mockCampaigns);
          console.log(`✅ Loaded ${mockCampaigns.length} MOCK campaigns`);
          setLoading(false);
          return;
        }

        // Modo producción requiere business ID
        if (!currentBusiness?.id) {
          setLoading(false);
          return;
        }

        const data = await loadCampaigns(currentBusiness.id);
        setCampaigns(data);
      } catch (error) {
        console.error('Error loading campaigns:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, [currentBusiness?.id]);

  // Calculate totals
  const totalViews = campaigns.reduce((sum, c) => sum + (c.views_count || 0), 0);
  const totalRatings = campaigns.reduce((sum, c) => sum + (c.ratings_captured || 0), 0);
  const totalRedirects = campaigns.reduce((sum, c) => sum + (c.redirected_count || 0), 0);
  const totalFeedback = campaigns.reduce((sum, c) => sum + (c.internal_feedback_count || 0), 0);
  
  const conversionRate = totalViews > 0 ? Math.round((totalRatings / totalViews) * 100) : 0;
  const redirectRate = totalRatings > 0 ? Math.round((totalRedirects / totalRatings) * 100) : 0;

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleCampaignStatus = async (campaign: Campaign) => {
    try {
      const newStatus = campaign.status === 'active' ? 'paused' : 'active';
      await campaignService.updateStatus(campaign.id, newStatus);
      
      // Update local state
      setCampaigns(campaigns.map(c => 
        c.id === campaign.id 
          ? { ...c, status: newStatus }
          : c
      ));
    } catch (error) {
      console.error('Error toggling campaign status:', error);
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignName.trim() || !currentBusiness?.id) return;

    setCreating(true);
    try {
      const newCampaign = await campaignService.create(currentBusiness.id, campaignName.trim());
      setCampaigns([newCampaign, ...campaigns]);
      setCampaignName('');
      setShowCreateModal(false);
      
      // Show QR modal for new campaign
      setQRCampaign(newCampaign);
      setShowQRModal(true);
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Error al crear la campaña. Por favor intenta de nuevo.');
    } finally {
      setCreating(false);
    }
  };

  const handleViewFeedback = async (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowFeedbackModal(true);
    setFeedbackLoading(true);

    try {
      // 🎬 MODO DEMO: Usar mock data
      if (DEMO_MODE.feedback) {
        await new Promise(resolve => setTimeout(resolve, 400));
        const feedbackForCampaign = mockFeedbackItems.filter(f => f.campaign_id === campaign.id);
        setFeedbackItems(feedbackForCampaign);
        console.log(`✅ Loaded ${feedbackForCampaign.length} MOCK feedback items`);
        setFeedbackLoading(false);
        return;
      }

      const filters = feedbackFilter === 'pending' ? { status: 'pending' as const } :
                     feedbackFilter === 'resolved' ? { status: 'resolved' as const } :
                     feedbackFilter === 'critical' ? { critical_only: true } :
                     undefined;

      const data = await loadCampaignFeedback(campaign.id, filters);
      setFeedbackItems(data);
    } catch (error) {
      console.error('Error loading feedback:', error);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleUpdateResolution = async (reviewId: string, status: 'resolved' | 'ignored') => {
    try {
      await updateFeedbackResolution(reviewId, status);
      
      // Update local state
      setFeedbackItems(feedbackItems.map(item =>
        item.id === reviewId
          ? { ...item, resolution_status: status, resolved_at: new Date().toISOString() }
          : item
      ));
    } catch (error) {
      console.error('Error updating resolution:', error);
    }
  };

  const getFilteredFeedback = () => {
    if (feedbackFilter === 'all') return feedbackItems;
    if (feedbackFilter === 'pending') return feedbackItems.filter(f => f.resolution_status === 'pending');
    if (feedbackFilter === 'resolved') return feedbackItems.filter(f => f.resolution_status === 'resolved');
    // ✅ Usar sentiment NLP para críticas, manteniendo critical_flags como backup
    if (feedbackFilter === 'critical') return feedbackItems.filter(f => 
      f.sentiment === 'negative' || (f.critical_flags && f.critical_flags.length > 0)
    );
    return feedbackItems;
  };

  const filteredFeedback = getFilteredFeedback();

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return `Hace ${diffDays}d`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campañas de Reseñas</h1>
          <p className="text-sm text-gray-600 mt-1">
            Genera links y QR codes para solicitar reseñas a tus clientes
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Nueva campaña
        </button>
      </div>

      {/* Stats Hero */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Links Generados</span>
            <QrCode className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{campaigns.length}</div>
          <div className="text-xs text-gray-500 mt-1">Activas: {campaigns.filter(c => c.status === 'active').length}</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Visitas Totales</span>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{totalViews}</div>
          <div className="text-xs text-green-600 mt-1">{conversionRate}% conversión</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Feedback Capturado</span>
            <MessageSquare className="h-4 w-4 text-yellow-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{totalFeedback}</div>
          <div className="text-xs text-gray-500 mt-1">{totalRatings} ratings totales</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">A Plataformas</span>
            <ArrowUpRight className="h-4 w-4 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{totalRedirects}</div>
          <div className="text-xs text-gray-500 mt-1">{redirectRate}% de ratings</div>
        </div>
      </div>

      {/* Campaigns Grid or Empty State */}
      {campaigns.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <QrCode className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No tienes campañas aún
          </h3>
          <p className="text-gray-600 mb-6">
            Crea tu primera campaña para empezar a recopilar feedback
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Crear primera campaña
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {campaigns.map((campaign) => {
            const campaignConversionRate = campaign.views_count > 0 
              ? Math.round((campaign.ratings_captured / campaign.views_count) * 100) 
              : 0;

            return (
              <div
                key={campaign.id}
                className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1 text-lg">
                      {campaign.name}
                    </h3>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        campaign.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {campaign.status === 'active' ? '✓ Activa' : '⏸ Pausada'}
                    </span>
                  </div>
                  <button
                    onClick={() => toggleCampaignStatus(campaign)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title={campaign.status === 'active' ? 'Pausar' : 'Activar'}
                  >
                    {campaign.status === 'active' ? (
                      <Pause className="h-4 w-4 text-gray-600" />
                    ) : (
                      <Play className="h-4 w-4 text-gray-600" />
                    )}
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-blue-700">
                      {campaign.views_count}
                    </div>
                    <div className="text-xs text-blue-600">Visitas</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-green-700">
                      {campaign.ratings_captured}
                    </div>
                    <div className="text-xs text-green-600">Ratings</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-purple-700">
                      {campaign.redirected_count}
                    </div>
                    <div className="text-xs text-purple-600">A plataformas</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-orange-700">
                      {campaign.internal_feedback_count}
                    </div>
                    <div className="text-xs text-orange-600">Feedback interno</div>
                  </div>
                </div>

                {/* Conversion Rate */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Tasa de conversión</span>
                    <span className="font-semibold text-gray-900">
                      {campaignConversionRate}%
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(campaignConversionRate, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Link & Actions */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={campaignService.getLandingURL(campaign.short_code)}
                      readOnly
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 font-mono text-gray-700"
                    />
                    <button
                      onClick={() => handleCopy(campaignService.getLandingURL(campaign.short_code), campaign.id)}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors flex items-center gap-1"
                    >
                      {copiedId === campaign.id ? (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copiar
                        </>
                      )}
                    </button>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => window.open(`/r/${campaign.short_code}`, '_blank')}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Ver Landing
                    </button>
                    <button
                      onClick={() => {
                        setQRCampaign(campaign);
                        setShowQRModal(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm transition-colors"
                    >
                      <QrCode className="h-4 w-4" />
                      Ver QR
                    </button>
                    <button
                      onClick={() => handleViewFeedback(campaign)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm transition-colors"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Feedback ({campaign.internal_feedback_count})
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">Nueva Campaña</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">
              Se creará un link único para solicitar reseñas. Podrás compartirlo como link o QR code.
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la campaña
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Ej: QR en Mesas - Cena"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCampaign()}
              />
              <p className="text-xs text-gray-500 mt-1">
                Usa nombres descriptivos para identificarlas fácilmente
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateCampaign}
                disabled={!campaignName.trim() || creating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {creating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creando...
                  </>
                ) : (
                  'Crear'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQRModal && qrCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">Código QR</h2>
              <button
                onClick={() => setShowQRModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">{qrCampaign.name}</p>
              
              <div className="bg-gray-50 rounded-lg p-6 mb-4">
                <img
                  src={campaignService.generateQRCodeURL(qrCampaign.short_code)}
                  alt="QR Code"
                  className="mx-auto"
                />
              </div>

              <div className="space-y-2">
                <a
                  href={campaignService.generateQRCodeURL(qrCampaign.short_code)}
                  download={`qr-${qrCampaign.short_code}.png`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Descargar QR
                </a>
                <button
                  onClick={() => {
                    handleCopy(campaignService.getLandingURL(qrCampaign.short_code), qrCampaign.id);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Copy className="h-4 w-4" />
                  {copiedId === qrCampaign.id ? 'Copiado!' : 'Copiar Link'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && selectedCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">Feedback Interno</h2>
                <p className="text-sm text-gray-600">{selectedCampaign.name}</p>
              </div>
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6 overflow-x-auto">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'pending', label: 'Pendientes' },
                { id: 'resolved', label: 'Resueltos' },
                { id: 'critical', label: 'Críticos' }
              ].map(filter => (
                <button
                  key={filter.id}
                  onClick={() => {
                    setFeedbackFilter(filter.id as any);
                    handleViewFeedback(selectedCampaign);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    feedbackFilter === filter.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Feedback List */}
            {feedbackLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredFeedback.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No hay feedback para mostrar</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredFeedback.map((item) => {
                  const isCritical = item.rating_value <= 2 || (item.critical_flags && item.critical_flags.length > 0);
                  const borderColor = item.rating_value <= 2 ? 'border-red-200 bg-red-50' :
                                     item.rating_value === 3 ? 'border-yellow-200 bg-yellow-50' :
                                     'border-green-200 bg-green-50';

                  return (
                    <div key={item.id} className={`border rounded-lg p-4 ${borderColor}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${
                                  star <= item.rating_value
                                    ? 'text-yellow-400 fill-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-gray-600">
                            {getRelativeTime(item.created_at)}
                          </span>
                          {isCritical && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
                              CRÍTICO
                            </span>
                          )}
                        </div>
                        
                        {item.resolution_status === 'pending' ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateResolution(item.id, 'resolved')}
                              className="text-xs px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                              Marcar resuelto
                            </button>
                            <button
                              onClick={() => handleUpdateResolution(item.id, 'ignored')}
                              className="text-xs px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                            >
                              Ignorar
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-lg">
                            ✓ {item.resolution_status === 'resolved' ? 'Resuelto' : 'Ignorado'}
                          </span>
                        )}
                      </div>

                      {/* Aspects */}
                      {item.selected_aspects && item.selected_aspects.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {item.selected_aspects.map((aspect: string) => (
                            <span
                              key={aspect}
                              className="px-2 py-1 bg-white border border-gray-300 text-xs rounded"
                            >
                              {aspect.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Executive Summary or Review Text */}
                      {item.executive_summary ? (
                        <p className="text-sm text-gray-800 mb-3">
                          {item.executive_summary}
                        </p>
                      ) : item.review_text ? (
                        <p className="text-sm text-gray-800 mb-3">
                          "{item.review_text}"
                        </p>
                      ) : null}

                      {/* Critical Flags */}
                      {item.critical_flags && item.critical_flags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {item.critical_flags.map((flag: string) => (
                            <span
                              key={flag}
                              className="px-2 py-1 bg-red-200 text-red-900 text-xs font-medium rounded"
                            >
                              ⚠️ {flag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Metrics */}
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        {item.ces_score && (
                          <span>CES: {item.ces_score}/5</span>
                        )}
                        {item.nps_score !== null && item.nps_score !== undefined && (
                          <span>NPS: {item.nps_score}/10</span>
                        )}
                        {item.customer_email && (
                          <span className="flex items-center gap-1">
                            📧 {item.customer_email}
                          </span>
                        )}
                        {item.customer_phone && (
                          <span className="flex items-center gap-1">
                            📱 {item.customer_phone}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Mostrando {filteredFeedback.length} de {feedbackItems.length} feedbacks
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Campaigns;

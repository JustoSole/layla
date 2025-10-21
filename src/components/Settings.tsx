import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessContext } from '../contexts/BusinessContext';
import { 
  Settings as SettingsIcon, 
  Link as LinkIcon, 
  Edit3, 
  Trash2, 
  Plus, 
  ExternalLink, 
  User, 
  LogOut, 
  Save,
  X,
  Check,
  Globe,
  MapPin,
  Users
} from 'lucide-react';
import { buildGoogleReviewUrl } from '../utils/reviewLinks';

interface BusinessLink {
  id: string;
  platform: 'Google' | 'TripAdvisor' | 'Facebook' | 'Other';
  url: string;
  isActive: boolean;
}

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { currentBusiness, setCurrentBusiness } = useBusinessContext();
  
  // Estados para gestión de datos
  const [myLinks, setMyLinks] = useState<BusinessLink[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('reputacionlocal_my_links');
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((link: any) =>
        link && typeof link === 'object' && typeof link.id === 'string' && typeof link.url === 'string'
      );
    } catch {
      return [];
    }
  });

  // Estados para modals y edición
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [editUrlError, setEditUrlError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string }>();
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [newLinkPlatform, setNewLinkPlatform] = useState<BusinessLink['platform']>('Google');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  // Persistir enlaces en localStorage
  useEffect(() => {
    try {
      localStorage.setItem('reputacionlocal_my_links', JSON.stringify(myLinks));
    } catch {
      // ignoramos errores de almacenamiento
    }
  }, [myLinks]);

  // UX helper para tomar enlaces preexistentes del negocio (si los hay)
  useEffect(() => {
    if (!currentBusiness) return;
    const businessUrl = (currentBusiness as any)?.url || currentBusiness?.website || null;
    const googlePlaceId = currentBusiness?.google_place_id || currentBusiness?.placeId || null;
    const googleCid = (currentBusiness as any)?.google_cid || null;
    const googleReviewLink = buildGoogleReviewUrl(googlePlaceId, currentBusiness?.name || null, googleCid);

    setMyLinks(prev => {
      let updated = prev;
      const appendIfMissing = (platform: BusinessLink['platform'], url: string | null) => {
        if (!url) return;
        const exists = updated.some(link => link.platform === platform && link.url === url);
        if (exists) return;

        const uniqueId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        const seededLink: BusinessLink = {
          id: `seed-${platform}-${uniqueId}`,
          platform,
          url,
          isActive: true
        };

        updated = updated === prev ? [...prev, seededLink] : [...updated, seededLink];
      };

      appendIfMissing('Google', googleReviewLink);
      appendIfMissing('Other', businessUrl);

      return updated;
    });
  }, [currentBusiness?.external_place_id, currentBusiness?.google_place_id, currentBusiness?.placeId, currentBusiness?.website]);

  // Funciones para gestión de links
  const handleEditLink = (linkId: string) => {
    const link = myLinks.find(l => l.id === linkId);
    if (link) {
      setEditingLinkId(linkId);
      setEditUrl(link.url);
    }
  };

  const handleSaveEdit = () => {
    if (!editingLinkId) return;

    // Validación simple de URL
    const isValidUrl = (() => {
      try { new URL(editUrl); } catch { return false; }
      const allowed = ['google.', 'maps.google.', 'tripadvisor.'];
      return allowed.some((k) => editUrl.includes(k));
    })();

    if (!isValidUrl) {
      setEditUrlError('URL inválida. Pegá el link de tu perfil oficial (Google o TripAdvisor).');
      return;
    }

    setMyLinks(prev => prev.map(link => 
      link.id === editingLinkId
        ? { ...link, url: editUrl }
        : link
    ));
    
    setEditingLinkId(null);
    setEditUrl('');
    setEditUrlError(null);
  };

  const handleDeleteLink = (linkId: string) => {
    setMyLinks(prev => prev.filter(link => link.id !== linkId));
  };

  const handleToggleLink = (linkId: string) => {
    setMyLinks(prev => prev.map(link => 
      link.id === linkId 
        ? { ...link, isActive: !link.isActive }
        : link
    ));
  };

  const handleAddLink = () => {
    if (!showAddLinkModal || !newLinkUrl.trim()) return;

    const newLink: BusinessLink = {
      id: Date.now().toString(),
      platform: newLinkPlatform,
      url: newLinkUrl.trim(),
      isActive: true
    };

    setMyLinks(prev => [...prev, newLink]);

    setShowAddLinkModal(false);
    setNewLinkUrl('');
    setNewLinkPlatform('Google');
  };

  const handleLogout = () => {
    setCurrentBusiness(null);
    navigate('/');
  };

  // Verificar si tenemos las plataformas principales configuradas
  const hasMainPlatforms = () => {
    const platforms = myLinks.map(link => link.platform);
    return platforms.includes('Google') && platforms.includes('TripAdvisor');
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'Google':
        return <Globe className="h-4 w-4 text-blue-600" />;
      case 'TripAdvisor':
        return <MapPin className="h-4 w-4 text-green-600" />;
      case 'Facebook':
        return <User className="h-4 w-4 text-blue-700" />;
      default:
        return <LinkIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'Google':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'TripAdvisor':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'Facebook':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <SettingsIcon className="h-6 w-6 mr-2 text-blue-600" />
            Configuración
          </h2>
          <p className="text-gray-600 mt-1">Gestiona tus enlaces y configuración de cuenta</p>
        </div>
      </div>

      {/* Mi Negocio - Links */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
          <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <User className="h-5 w-5 mr-2 text-blue-600" />
            Enlaces del Negocio
          </h3>
            <p className="text-sm text-gray-600 mt-1">
              Enlaces a tus perfiles en diferentes plataformas
            </p>
              <div className="relative inline-block mt-2">
                <button
                  type="button"
                  onClick={() => setShowHelp(v => !v)}
                  className="text-xs text-blue-600 hover:text-blue-700"
                  aria-expanded={showHelp}
                >
                  ¿Cómo obtener tu link?
                </button>
                {showHelp && (
                  <div className="absolute z-20 mt-2 w-72 rounded-md border border-gray-200 bg-white p-3 text-xs text-gray-700 shadow-lg">
                    <ol className="list-decimal ml-4 space-y-1">
                      <li>Abrí Google Maps y buscá tu negocio.</li>
                      <li>Entrá a tu ficha.</li>
                      <li>Copiá el enlace de “Escribir una reseña” o de la ficha principal.</li>
                      <li>En TripAdvisor, copiá el link de tu perfil oficial.</li>
                    </ol>
                  </div>
                )}
              </div>
          </div>
          
          {!hasMainPlatforms() ? (
            <button
              onClick={() => setShowAddLinkModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Agregar Enlace</span>
            </button>
          ) : (
            <div className="text-sm text-green-600 flex items-center space-x-1">
              <Check className="h-4 w-4" />
              <span>Plataformas principales configuradas</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {myLinks.map((link) => (
            <div key={link.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3">
                {getPlatformIcon(link.platform)}
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getPlatformColor(link.platform)}`}>
                      {link.platform}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      link.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {link.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  {editingLinkId === link.id ? (
                    <div className="flex items-center space-x-2 mt-2">
                      <input
                        type="url"
                        value={editUrl}
                        onChange={(e) => { setEditUrl(e.target.value); if (editUrlError) setEditUrlError(null); }}
                        className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://..."
                      />
                      <button
                        onClick={() => { handleSaveEdit(); setToast({ visible: true, message: '¡Listo! Guardamos tu link.' }); setTimeout(() => setToast({ visible: false, message: '' }), 1200); }}
                        className="p-1 text-green-600 hover:bg-green-100 rounded"
                        disabled={!editUrl}
                        aria-label="Guardar enlace"
                      >
                        <Save className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingLinkId(null)}
                        className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      {editUrlError && (
                        <span className="text-xs text-red-600 ml-2">{editUrlError}</span>
                      )}
                    </div>
                  ) : (
                  <p className="text-sm text-gray-600 mt-1 max-w-md truncate">{link.url}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.open(link.url, '_blank')}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                  title="Abrir enlace"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleToggleLink(link.id)}
                  className={`p-2 rounded ${
                    link.isActive ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-100'
                  }`}
                  title={link.isActive ? 'Desactivar' : 'Activar'}
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleEditLink(link.id)}
                  className="p-2 text-blue-600 hover:bg-blue-100 rounded"
                  title="Editar enlace"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteLink(link.id)}
                  className="p-2 text-red-600 hover:bg-red-100 rounded"
                  title="Eliminar enlace"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          
          {myLinks.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <LinkIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No hay enlaces configurados</p>
            </div>
          )}
        </div>
      </div>

      {/* Competidores - redirección */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Users className="h-5 w-5 mr-2 text-purple-600" />
              Competidores
            </h3>
            <p className="text-sm text-gray-600 max-w-xl">
              Gestioná competidores desde la pestaña dedicada <strong>Competencia</strong>. Tenés búsqueda, enlaces inteligentes y benchmarks en un solo lugar.
            </p>
            <button
              onClick={() => navigate('/competitors')}
              className="mt-2 inline-flex items-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
            >
              <Users className="h-4 w-4" />
              <span>Ir a Competencia</span>
            </button>
          </div>
        <div className="text-sm text-gray-500 ml-auto max-w-xs">
          <p className="font-medium text-gray-700">¿Qué vas a encontrar?</p>
          <ul className="mt-1 space-y-1 list-disc list-inside">
            <li>Benchmark en vivo vs competidores</li>
            <li>Brechas de rating y reseñas</li>
            <li>Acciones sugeridas para superarlos</li>
          </ul>
        </div>
        </div>
      </div>

      {/* Configuración de Cuenta */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <SettingsIcon className="h-5 w-5 mr-2 text-gray-600" />
          Configuración de Cuenta
        </h3>

        <div className="space-y-4">
          {/* Información de la cuenta */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-blue-900">Plan Actual: Premium</p>
                <p className="text-sm text-blue-700">Próxima facturación: 15 Nov 2024</p>
              </div>
              <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-medium">
                Activo
              </span>
            </div>
          </div>

          {/* Acciones de cuenta */}
          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => setShowLogoutModal(true)}
              className="flex items-center justify-center space-x-2 p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
            >
              <LogOut className="h-5 w-5" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal para agregar enlace */}
      {showAddLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Agregar Nuevo Enlace</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plataforma
                </label>
                <select
                  value={newLinkPlatform}
                  onChange={(e) => setNewLinkPlatform(e.target.value as BusinessLink['platform'])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Google">Google</option>
                  <option value="TripAdvisor">TripAdvisor</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Other">Otra</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL del Enlace
                </label>
                <input
                  type="url"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  placeholder="https://ejemplo.com/mi-perfil"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                        onClick={() => {
                          setShowAddLinkModal(false);
                          setNewLinkUrl('');
                          setNewLinkPlatform('Google');
                        }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddLink}
                disabled={!newLinkUrl.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación - Cerrar sesión */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <LogOut className="h-6 w-6 text-gray-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Cerrar Sesión</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que quieres cerrar sesión? Tendrás que volver a configurar tu negocio la próxima vez.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {toast?.visible && (
        <div role="status" aria-live="polite" className="fixed bottom-4 right-4 z-50 bg-gray-900 text-white text-sm px-3 py-2 rounded-md shadow-lg">
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default Settings;

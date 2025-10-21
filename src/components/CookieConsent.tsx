import React, { useEffect, useState } from 'react';

const CONSENT_KEY = 'reputacionlocal_cookie_consent_v1';

const CookieConsent: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (!stored) setVisible(true);
    } catch {
      // Si falla localStorage, no mostramos banner para no bloquear
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(CONSENT_KEY, 'accepted');
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 z-50">
      <div className="bg-gray-900 text-white rounded-lg shadow-lg p-4 max-w-md ml-0 md:ml-auto">
        <p className="text-sm mb-3 leading-relaxed">
          Usamos cookies esenciales y analíticas para que ReputacionLocal funcione y nos ayuden a mejorar la experiencia. Podés gestionar tu consentimiento cuando quieras.
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 text-sm">
          <a
            href="mailto:legal@reputacionlocal.com?subject=Consulta%20sobre%20cookies"
            className="inline-flex items-center justify-center rounded-md border border-white/30 px-3 py-1.5 text-white hover:border-white"
            target="_blank"
            rel="noreferrer"
          >
            Más info
          </a>
          <button 
            onClick={accept}
            className="px-3 py-1.5 bg-white text-gray-900 rounded-md font-medium hover:bg-gray-100"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;



// Utilidades para construir enlaces de reseñas, WhatsApp y QR (client-side)

export const buildGoogleReviewUrl = (googlePlaceId?: string | null, businessNameForSearch?: string | null, googleCid?: string | null) => {
  if (googlePlaceId && typeof googlePlaceId === 'string') {
    return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(googlePlaceId)}`;
  }
  if (googleCid && typeof googleCid === 'string') {
    return `https://www.google.com/maps/search/?api=1&cid=${encodeURIComponent(googleCid)}`;
  }
  const q = businessNameForSearch
    ? `${businessNameForSearch} reseñas`
    : 'reseñas de negocios locales';
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
};

export const buildTripAdvisorReviewUrl = (tripadvisorUrlPath?: string | null) => {
  if (!tripadvisorUrlPath) return null;
  return `https://www.tripadvisor.com/${tripadvisorUrlPath.replace(/^\//, '')}`;
};

// Abre WhatsApp con mensaje prellenado. phone debe ir sin + ni espacios (ej: 541123456789)
export const buildWhatsAppUrl = (message: string, phone?: string) => {
  const base = phone && /\d{7,}/.test(phone) ? `https://wa.me/${phone}` : 'https://wa.me/';
  const params = new URLSearchParams({ text: message });
  return `${base}?${params.toString()}`;
};

// QR como PNG via API pública (rápido para demo). size: 200..1000
export const buildQrPngUrl = (targetUrl: string, size = 512, colorHex?: string, bgHex?: string) => {
  const params = new URLSearchParams({ data: targetUrl, size: `${size}x${size}` });
  if (colorHex) params.set('color', colorHex.replace('#', ''));
  if (bgHex) params.set('bgcolor', bgHex.replace('#', ''));
  return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`;
};

export const defaultWhatsappTemplates = (businessName?: string) => {
  const name = businessName || 'nosotros';
  return [
    `¡Gracias por elegir ${name}! ¿Nos dejás tu opinión? Tu reseña nos ayuda mucho: {LINK}`,
    `Si tuviste una buena experiencia hoy, ¿nos regalás 2 minutos para dejar tu reseña? {LINK} ¡Muchas gracias! 🙌`,
    `Tu opinión hace la diferencia. Dejá tu reseña acá: {LINK}`
  ];
};






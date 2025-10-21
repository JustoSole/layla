# ⚡ Guía Rápida de Testing - Acceso a Restaurantes

## 1. Iniciar el servidor

```bash
cd /Users/justosoleno/Downloads/project
npm run dev
```

Espera a que veas: `➜  Local:   http://localhost:5174/`

## 2. Acceder a Chrome DevTools (Automatizado)

Ya tienes acceso a través del MCP de Chrome. Solo necesitas navegar.

## 3. Ir directamente al Dashboard

URL: `http://localhost:5174/dashboard`

## 4. Saltear Onboarding (Si sale)

Ejecuta en la consola del navegador:

```javascript
const restaurante = {
  name: "Chinofino",
  placeId: "eeaf6ccc-dd99-4f41-b1a7-3fc3170ef542",
  external_place_id: "eeaf6ccc-dd99-4f41-b1a7-3fc3170ef542",
  rating: 4.4,
  totalReviews: 200,
  address: "Buenos Aires, Argentina",
  category: "Restaurante"
};
localStorage.setItem('reputacionlocal_business', JSON.stringify(restaurante));
window.location.href = '/dashboard';
```

## 5. Restaurantes Disponibles en BD

| Nombre | Place ID | Reviews | Puerto |
|--------|----------|---------|--------|
| **Chinofino** | eeaf6ccc-dd99-4f41-b1a7-3fc3170ef542 | 200 | 5174 |
| El Pingüino de Palermo | d73be0c8-1e6c-45e7-ab11-f1438d1c2e37 | 315 | 5174 |
| La Trattoria | [req custom] | N/A | 5174 |

## 6. Secciones Importantes a Verificar

### Dashboard
- ✅ Gráfico "Tendencia de Rating" (debe mostrar datos)
- ✅ Botones de navegación

### Insights
- ✅ Gráfico "Evolución del Sentiment Index" (77/100)
- ✅ Análisis Profundo de Temas
- ✅ Botones "Ver X →" en subtemas

### Reviews
- ✅ Tabla se llena al hacer clic en subtemas
- ✅ Filtrados correctamente por sub_aspect

## 7. Cambiar Restaurante Rápidamente

```javascript
// Para cambiar a otro restaurante
const nuevoRestaurante = {
  name: "El Pingüino de Palermo",
  external_place_id: "d73be0c8-1e6c-45e7-ab11-f1438d1c2e37",
  placeId: "d73be0c8-1e6c-45e7-ab11-f1438d1c2e37",
  rating: 4.5,
  totalReviews: 315
};
localStorage.setItem('reputacionlocal_business', JSON.stringify(nuevoRestaurante));
window.location.href = '/dashboard';
```

## 8. Verificar Errores en Consola

En Chrome DevTools → Console tab:
- ❌ Si ves `Uncaught Error` → Bug a revisar
- ✅ Si solo ves warnings → Normal

## 9. Debug Rápido - Ver datos en Console

```javascript
// Ver qué datos está cargando
const business = JSON.parse(localStorage.getItem('reputacionlocal_business'));
console.log('Negocio seleccionado:', business);
```

## 10. Reiniciar Todo

```bash
# Si algo se rompe, limpia y reinicia:
rm -rf node_modules/.vite
npm run dev
```

---

**Última actualización:** Testing automatizado con Chrome DevTools MCP

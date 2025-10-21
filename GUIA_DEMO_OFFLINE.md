# 🎬 Guía Demo Offline - Sin WiFi

## ✅ **Estado Actual: 100% OFFLINE READY!**

Tu sistema ahora funciona **completamente offline** para demos en vivo. Todos los componentes usan mock data realista.

---

## 🚀 **Preparación para Demo**

### **Opción 1: Demo 100% Offline (RECOMENDADO)**

```bash
# 1. Asegúrate de que modo demo esté activo
# En src/config/demo.ts:
enabled: true ✅

# 2. Ejecutar el sistema
npm run dev

# 3. Pre-cargar pestañas (opcional pero recomendado)
```

**URLs para pre-cargar:**
- Dashboard: `http://localhost:5173/dashboard`
- Competencia: `http://localhost:5173/competitor-benchmark` 
- Reseñas: `http://localhost:5173/reviews`
- Campañas: `http://localhost:5173/campaigns`
- Staff: `http://localhost:5173/insights` (ir a pestaña Staff)
- Análisis: `http://localhost:5173/insights`

### **Opción 2: Datos de Celular como Backup**

Si necesitas datos reales como backup:

```bash
# 1. Cambiar a modo producción
# En src/config/demo.ts:
enabled: false

# 2. Conectarte al hotspot de tu celular
# 3. npm run dev
```

---

## 📊 **Datos Mock Disponibles**

### **💬 Reviews (8 reseñas reales)**
- **Positivas (5):** María González, Luis Rodríguez, Fernando Castro, etc.
- **Neutrales (1):** Carmen López (3★)
- **Negativas (2):** Ana Martín (2★), Pedro Gómez (1★)
- **Con imágenes:** 3 reseñas incluyen fotos
- **Staff mencionado:** Carlos (Chef), María (Mesera), Diego (Mesero), Roberto (Ayudante)

### **🏆 Competencia (5 restaurantes)**
- La Parrilla del Centro - 4.7★ (892 reviews)
- El Buen Sabor - 4.5★ (634 reviews) 
- Restaurante Don José - 4.3★ (421 reviews)
- Casa de Comidas María - 4.2★ (305 reviews)
- El Rincón Gourmet - 3.9★ (187 reviews)

### **🎯 Campañas (4 activas)**
1. **QR en Mesas - Cena**: 342 visitas → 127 ratings
2. **Email Post-Visita**: 218 visitas → 98 ratings
3. **Cartel en Entrada**: 156 visitas → 54 ratings
4. **Ticket de Compra**: 89 visitas (PAUSADA)

### **👥 Staff Dashboard (9 miembros)**
- **Top Performers:** Carlos (Chef) 92%, María (Mesera) 91%
- **Necesitan Atención:** Diego 68%, Roberto 50%
- **236 menciones totales** con sentiment analysis

---

## 🎯 **Script de Demo Sugerido**

### **1. Dashboard (2-3 min)**
```
"Aquí ven el panel principal con KPIs en tiempo real:
- 8 reseñas totales, promedio 3.6 estrellas
- 3 reseñas en los últimos 7 días 
- 2 reseñas críticas que necesitan atención
- Temas principales: Servicio, Comida, Personal"
```

### **2. Competencia (2-3 min)**
```
"Monitoreo automático de competencia:
- Estamos 4to lugar con 3.6★ vs líder 4.7★
- Health Score 68% - hay margen de mejora
- Plan de acción automático basado en gaps"
```

### **3. Reseñas (3-4 min)**
```
"Gestión inteligente de reseñas:
- 8 reseñas con análisis automático de sentiment
- 2 críticas que requieren respuesta inmediata
- Sistema detecta menciones de staff automáticamente
- Filtros por plataforma, rating, y aspectos"
```

### **4. Staff Dashboard (2-3 min)**
```
"IA detecta menciones automáticas del personal:
- Carlos el chef: 92% positivo, 38 menciones
- Diego necesita coaching: solo 68% positivo
- Sistema identifica automáticamente variaciones de nombres"
```

### **5. Campañas (2-3 min)**
```
"Campañas QR para capturar más reseñas:
- 4 campañas activas con métricas de conversión
- QR generados automáticamente
- Feedback capturado: 127 ratings, 89 redirects"
```

### **6. Análisis Profundo (2 min)**
```
"Insights automáticos con IA:
- Gap to Five analysis: qué falta para 5 estrellas
- Aspectos críticos: Tiempo de espera, Personal
- Recomendaciones automáticas de mejora"
```

---

## 🔧 **Tips Técnicos**

### **Performance**
- Mock data carga en ~600ms (simula API real)
- Sin llamadas externas = sin lag de red
- Todas las imágenes optimizadas para demo

### **Robustez**
- Si algo falla, recargar la página
- Logs en consola confirman modo demo
- Fallback automático a mocks si hay error

### **Credibilidad**
- Datos realistas de restaurante argentino
- Nombres hispanos auténticos
- Menciones coherentes entre secciones
- Fechas recientes (enero 2024)

---

## 🚨 **Troubleshooting**

### **Si algo no carga:**
1. Verificar consola: debe decir "MOCK" en logs
2. Verificar `src/config/demo.ts` → `enabled: true`
3. Refrescar navegador
4. Reiniciar `npm run dev`

### **Si necesitas internet:**
1. Cambiar `demo.ts` → `enabled: false`
2. Conectar a hotspot del celular
3. Tener credenciales Supabase válidas

### **Backup de emergencia:**
- Carpeta `dist/` contiene versión compilada
- `npm run build` → `npm run preview` (sin dependencias)

---

## ✨ **Ventajas del Modo Demo**

✅ **Sin dependencias externas** - WiFi malo no es problema  
✅ **Datos coherentes** - historia completa entre secciones  
✅ **Performance perfecto** - sin lag de red  
✅ **Narrativa controlada** - sabes exactamente qué mostrar  
✅ **Casos de uso completos** - positivos, negativos, críticos  
✅ **Staff detection real** - menciones automáticas funcionando  

**¡Tu sistema está listo para una demo impecable!** 🚀

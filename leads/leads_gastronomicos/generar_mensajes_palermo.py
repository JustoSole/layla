#!/usr/bin/env python3
"""
Pipeline Completo - Generación de Mensajes WhatsApp para Palermo
Procesa restaurantes, cafeterías y bares más relevantes de Palermo
Genera mensajes listos para enviar
"""

import json
import pandas as pd
from typing import Dict, List, Optional
from datetime import datetime

# ============================================================================
# CONFIGURACIÓN
# ============================================================================

PALERMO_KEYWORDS = [
    'Palermo', 'PALERMO', 'palermo',
    'Soho', 'Hollywood', 'Viejo',
    'C1414', 'C1425', 'C1426', 'C1427', 'C1428'  # Códigos postales Palermo
]

MIN_REVIEWS = 100  # Mínimo de reviews para ser relevante
MIN_RATING = 4.0   # Rating mínimo
MAX_RATING = 4.85  # Rating máximo (los muy altos no tienen pain)

# ============================================================================
# FUNCIONES DE PROCESAMIENTO
# ============================================================================

def clean_phone_number(phone: str) -> Optional[str]:
    """Limpia y formatea número de teléfono para WhatsApp Argentina"""
    if not phone:
        return None
    
    # Remover espacios, guiones, paréntesis
    cleaned = str(phone).strip()
    cleaned = cleaned.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
    
    # Remover el 0 inicial si existe (código de área argentino)
    if cleaned.startswith('0'):
        cleaned = cleaned[1:]
    
    # Obtener solo dígitos para validar
    digitos = ''.join(c for c in cleaned if c.isdigit())
    
    # Validar longitud mínima
    if len(digitos) < 10:
        return None
    
    # Formatear según el caso
    if cleaned.startswith('+54'):
        # Ya tiene código país
        # Verificar si tiene el 9 después del 54
        resto = cleaned[3:]  # Después de +54
        
        if resto.startswith('9'):
            # Ya tiene el 9, está bien
            return cleaned
        else:
            # Falta el 9, agregarlo
            return f"+549{resto}"
    
    elif cleaned.startswith('54'):
        # Tiene 54 pero sin +
        resto = cleaned[2:]
        if resto.startswith('9'):
            return f"+{cleaned}"
        else:
            return f"+549{resto}"
    
    elif cleaned.startswith('9'):
        # Empieza con 9 (ya tiene el identificador de móvil)
        return f"+54{cleaned}"
    
    else:
        # Número local (ej: 1147724911)
        # Agregar +54 9
        return f"+549{cleaned}"


def es_palermo(negocio: Dict) -> bool:
    """Verifica si el negocio está en Palermo"""
    
    # Verificar en dirección
    direccion = negocio.get('address', '')
    if any(kw in str(direccion) for kw in PALERMO_KEYWORDS):
        return True
    
    # Verificar en código postal
    address_info = negocio.get('address_info', {})
    zip_code = address_info.get('zip', '')
    if any(kw in str(zip_code) for kw in PALERMO_KEYWORDS):
        return True
    
    # Verificar en borough
    borough = address_info.get('borough', '')
    if 'Palermo' in str(borough):
        return True
    
    return False


def tiene_place_topics_validos(topics: Dict) -> bool:
    """Verifica que tenga place_topics válidos"""
    if not topics or len(topics) == 0:
        return False
    
    # Al menos 3 topics con menciones significativas
    topics_validos = [k for k, v in topics.items() if isinstance(v, int) and v >= 10]
    
    return len(topics_validos) >= 3


def traducir_topic(topic: str) -> str:
    """Traduce topics comunes del inglés al español"""
    
    traducciones = {
        'middle eastern food': 'comida árabe',
        'arabian food': 'comida árabe',
        'pitcher': 'jarras de cerveza',
        'slaughterhouse': 'parrilla',
        'white sauce': 'salsa blanca',
        'the best pizza': 'la mejor pizza',
        'food': 'comida',
        'drinks': 'tragos',
        'cocktails': 'cócteles',
        'beer': 'cerveza',
        'wine': 'vino',
        'coffee': 'café',
        'atmosphere': 'ambiente',
        'service': 'servicio',
        'music': 'música',
        'ambiance': 'ambiente',
        'hummus': 'hummus',
        'fugazzetta': 'fugazzetta',
        'price': 'precio',
        'quality': 'calidad'
    }
    
    topic_lower = topic.lower()
    for eng, esp in traducciones.items():
        if eng in topic_lower:
            return esp
    
    return topic


def obtener_top_3_topics(topics: Dict) -> List[tuple]:
    """Obtiene los top 3 topics con más menciones"""
    
    if not topics:
        return []
    
    # Ordenar por cantidad de menciones
    topics_sorted = sorted(topics.items(), key=lambda x: x[1], reverse=True)
    
    # Tomar top 3
    top_3 = []
    for topic, count in topics_sorted[:3]:
        topic_traducido = traducir_topic(topic)
        top_3.append((topic_traducido, count))
    
    return top_3


def calcular_reviews_4_estrellas(total_reviews: int) -> int:
    """Estima cantidad de reviews de 4★"""
    return int(total_reviews * 0.20)


def estimar_rating_potencial(rating_actual: float) -> float:
    """Estima rating potencial mejorando"""
    
    if rating_actual >= 4.7:
        return min(rating_actual + 0.1, 5.0)
    elif rating_actual >= 4.4:
        return min(rating_actual + 0.2, 4.9)
    elif rating_actual >= 4.0:
        return min(rating_actual + 0.4, 4.8)
    else:
        return min(rating_actual + 0.5, 4.7)


def calcular_impacto_clientes(rating_actual: float, rating_potencial: float) -> int:
    """Calcula % de impacto en clientes"""
    
    ctr_por_rating = {
        3.5: 0.50, 3.8: 0.65, 4.0: 1.00, 4.2: 1.20,
        4.4: 1.45, 4.6: 1.75, 4.8: 2.10, 5.0: 2.50
    }
    
    rating_actual_round = round(rating_actual * 5) / 5
    rating_potencial_round = round(rating_potencial * 5) / 5
    
    ctr_actual = ctr_por_rating.get(rating_actual_round, 1.0)
    ctr_potencial = ctr_por_rating.get(rating_potencial_round, 1.0)
    
    aumento = int(((ctr_potencial / ctr_actual) - 1) * 100)
    
    return max(aumento, 0)


def generar_mensaje(negocio: Dict, top_topics: List[tuple]) -> str:
    """Genera el mensaje WhatsApp completo con formato correcto"""
    
    nombre = negocio['title']
    reviews_count = negocio['reviews_count']
    rating = negocio['rating']
    
    # Calcular métricas
    reviews_4_estrellas = calcular_reviews_4_estrellas(reviews_count)
    rating_potencial = estimar_rating_potencial(rating)
    impacto = calcular_impacto_clientes(rating, rating_potencial)
    
    # Formatear reviews de 4★ (redondear para que suene natural)
    if reviews_4_estrellas > 1000:
        reviews_4_str = f"{int(reviews_4_estrellas/100)*100:,}+"
    else:
        reviews_4_str = f"{int(reviews_4_estrellas/10)*10}+"
    
    # Formatear rating potencial (solo 1 decimal después de la coma)
    rating_mejora = round((rating_potencial - rating) * 10) / 10  # Redondear a 0.1
    rating_potencial_str = f"{rating + 0.1:.1f}"  # Usar incremento de 0.1 para ser conservador
    
    # Construir mensaje (formato optimizado para WhatsApp)
    mensaje = f"Hola, analicé tus {reviews_count:,} reviews con IA:\n\n"
    mensaje += f"Lo que más destacan de {nombre}:\n"
    mensaje += f"→ {top_topics[0][1]:,} {top_topics[0][0]} ⭐\n"
    mensaje += f"→ {top_topics[1][1]:,} {top_topics[1][0]}\n"
    mensaje += f"→ {top_topics[2][1]:,} {top_topics[2][0]}\n\n"
    mensaje += f"Tenés {reviews_4_str} reviews de 4★ que podemos convertir a 5★\n\n"
    mensaje += f"También te mostramos:\n"
    mensaje += f"→ Qué dice la gente de tu equipo\n"
    mensaje += f"→ Cómo estás vs la competencia\n"
    mensaje += f"→ Cómo generar más reseñas 5 estrellas\n\n"
    mensaje += f"85% de los clientes miran reseñas antes de visitar un lugar y si mejoramos tu clasificación de {rating}★ a {rating_potencial_str}★ podemos lograr hasta un 10% más de clientes en promedio.\n\n"
    mensaje += f"Te gustaría tener una llamada así te cuento más?\n\n"
    mensaje += f"Saludos! Justo."

    return mensaje


# ============================================================================
# PROCESAMIENTO PRINCIPAL
# ============================================================================

def procesar_json(json_path: str) -> List[Dict]:
    """Procesa un archivo JSON y extrae negocios de Palermo"""
    
    print(f"\n📂 Procesando {json_path}...")
    
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    items = data['tasks'][0]['result'][0]['items']
    
    negocios_palermo = []
    
    for item in items:
        # Extraer rating
        rating_obj = item.get('rating')
        if not rating_obj:
            continue
        
        rating = rating_obj.get('value')
        votes_count = rating_obj.get('votes_count', 0)
        
        if not rating or rating < MIN_RATING or rating > MAX_RATING or votes_count < MIN_REVIEWS:
            continue
        
        # Verificar si es Palermo
        if not es_palermo(item):
            continue
        
        # Verificar place_topics
        place_topics = item.get('place_topics')
        if not tiene_place_topics_validos(place_topics):
            continue
        
        negocio = {
            'title': item.get('title'),
            'rating': rating,
            'reviews_count': votes_count,
            'phone': item.get('phone'),
            'address': item.get('address'),
            'url': item.get('url'),
            'place_id': item.get('place_id'),
            'place_topics': place_topics,
            'tipo': json_path.split('/')[-1].split('_')[0]  # restaurantes/cafeterias/bares
        }
        
        negocios_palermo.append(negocio)
    
    print(f"✅ Encontrados {len(negocios_palermo)} negocios en Palermo con place_topics")
    
    return negocios_palermo


def generar_mensajes_palermo():
    """Pipeline completo: procesa JSONs y genera mensajes"""
    
    print("🚀 PIPELINE: Generación de Mensajes para Palermo\n")
    print("="*70)
    
    # Paths de los JSONs
    base_path = 'resultados/'
    json_files = [
        f'{base_path}restaurantes_raw_caba_20251015_171924.json',
        f'{base_path}cafeterias_raw_caba_20251015_171932.json',
        f'{base_path}bares_raw_caba_20251015_171909.json'
    ]
    
    # Procesar todos los JSONs
    todos_negocios = []
    
    for json_file in json_files:
        try:
            negocios = procesar_json(json_file)
            todos_negocios.extend(negocios)
        except FileNotFoundError:
            print(f"⚠️  Archivo no encontrado: {json_file}")
        except Exception as e:
            print(f"❌ Error procesando {json_file}: {e}")
    
    print(f"\n📊 TOTAL negocios Palermo con place_topics: {len(todos_negocios)}")
    
    # Ordenar por relevancia (reviews_count) ANTES de eliminar duplicados
    todos_negocios.sort(key=lambda x: x['reviews_count'], reverse=True)
    
    # Eliminar duplicados por nombre (mantener el de más reviews)
    print(f"\n🗑️  Eliminando duplicados por nombre...")
    
    nombres_vistos = set()
    negocios_unicos = []
    duplicados_eliminados = 0
    
    for negocio in todos_negocios:
        nombre = negocio['title'].strip().lower()
        
        if nombre not in nombres_vistos:
            nombres_vistos.add(nombre)
            negocios_unicos.append(negocio)
        else:
            duplicados_eliminados += 1
            print(f"   ⏭️  Eliminando duplicado: {negocio['title']} ({negocio['reviews_count']} reviews)")
    
    print(f"✅ Eliminados {duplicados_eliminados} duplicados")
    
    # Usar negocios únicos
    negocios_seleccionados = negocios_unicos
    
    print(f"🎯 Generando mensajes para {len(negocios_seleccionados)} negocios únicos")
    print("\n" + "="*70)
    print("\n💬 Generando mensajes...\n")
    
    # Generar mensajes
    resultados = []
    
    for idx, negocio in enumerate(negocios_seleccionados, 1):
        
        # Obtener top 3 topics
        top_topics = obtener_top_3_topics(negocio['place_topics'])
        
        if len(top_topics) < 3:
            print(f"⚠️  Saltando {negocio['title']} - No tiene 3 topics válidos")
            continue
        
        # Formatear teléfono (usar función de limpieza)
        telefono = clean_phone_number(negocio['phone'])
        
        # Si no tiene teléfono válido, saltar
        if not telefono:
            print(f"⚠️  Saltando {negocio['title']} - Sin teléfono válido")
            continue
        
        # Generar mensaje
        mensaje = generar_mensaje(negocio, top_topics)
        
        # Calcular métricas para CSV
        reviews_4 = calcular_reviews_4_estrellas(negocio['reviews_count'])
        rating_pot = estimar_rating_potencial(negocio['rating'])
        impacto = calcular_impacto_clientes(negocio['rating'], rating_pot)
        
        resultados.append({
            'nombre': negocio['title'],
            'tipo': negocio['tipo'],
            'telefono': telefono,
            'rating_actual': negocio['rating'],
            'reviews_count': negocio['reviews_count'],
            'reviews_4_estrellas': reviews_4,
            'rating_potencial': rating_pot,
            'impacto_estimado': f"+{impacto}%",
            'top_topic_1': f"{top_topics[0][0]} ({top_topics[0][1]})",
            'top_topic_2': f"{top_topics[1][0]} ({top_topics[1][1]})",
            'top_topic_3': f"{top_topics[2][0]} ({top_topics[2][1]})",
            'mensaje': mensaje,
            'url_gmb': negocio['url'],
            'place_id': negocio['place_id'],
            'address': negocio['address'],
            'enviado': False,
            'respondio': '',
            'agendo_call': '',
            'hizo_call': '',
            'trial': '',
            'notas': ''
        })
        
        if idx % 10 == 0:
            print(f"⏳ Procesados {idx}...")
    
    # Crear DataFrame
    df = pd.DataFrame(resultados)
    
    print(f"\n✅ Mensajes generados: {len(df)}")
    
    # Exportar
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = f'resultados/mensajes_palermo_{timestamp}.csv'
    
    df.to_csv(output_file, index=False)
    
    print(f"\n💾 Exportado a: {output_file}")
    
    # Preview
    print(f"\n{'='*70}")
    print("📋 PREVIEW (primeros 3 mensajes):\n")
    
    for idx, row in df.head(3).iterrows():
        print(f"{'='*70}")
        print(f"📍 {row['nombre']} ({row['tipo']})")
        print(f"📞 {row['telefono']}")
        print(f"⭐ {row['rating_actual']}★ ({row['reviews_count']:,} reviews)")
        print(f"🎯 Topics: {row['top_topic_1']}, {row['top_topic_2']}, {row['top_topic_3']}")
        print(f"\n💬 MENSAJE:\n")
        print(row['mensaje'])
        print()
    
    print(f"{'='*70}")
    print("\n✅ PIPELINE COMPLETADO!")
    print(f"\n📊 Estadísticas:")
    print(f"   - Total procesados: {len(todos_negocios)}")
    print(f"   - Mensajes generados: {len(df)}")
    print(f"   - Por tipo: {df['tipo'].value_counts().to_dict()}")
    print(f"   - Rating promedio: {df['rating_actual'].mean():.2f}★")
    print(f"   - Reviews promedio: {df['reviews_count'].mean():.0f}")
    
    print(f"\n🚀 Próximos pasos:")
    print(f"   1. Abrir CSV: {output_file}")
    print(f"   2. Revisar mensajes")
    print(f"   3. Ajustar si hace falta")
    print(f"   4. ¡Empezar a enviar!")
    
    return df


# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    df_mensajes = generar_mensajes_palermo()


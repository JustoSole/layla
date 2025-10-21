#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
EXTRACTOR DE EMAILS DIRECTO - SIN BÚSQUEDA DATAFORSEO
=====================================================
Carga los archivos JSON existentes y extrae emails directamente de 3000 restaurantes.
Elimina duplicados y genera CSV final limpio.

Uso:
    python3 extraer_emails_directamente.py
"""

import sys
import json
import time
import re
import logging
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Set, Optional
import pandas as pd
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

# ==============================================================================
# CONFIGURACIÓN
# ==============================================================================

OUTPUT_DIR = Path(__file__).parent / "resultados"
OUTPUT_DIR.mkdir(exist_ok=True)

# Archivos JSON existentes
ARCHIVOS_JSON = [
    "restaurantes_raw_caba_20251015_171924.json",
    "bares_raw_caba_20251015_171909.json", 
    "cafeterias_raw_caba_20251015_171932.json"
]

# Archivo de salida
TIMESTAMP = datetime.now().strftime("%Y%m%d_%H%M%S")
CSV_FINAL = OUTPUT_DIR / f"emails_extraidos_{TIMESTAMP}.csv"

# Límite total de negocios a procesar
LIMITE_TOTAL = 3000

# Configuración de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(OUTPUT_DIR / f'extraccion_emails_{TIMESTAMP}.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# ==============================================================================
# CONFIGURACIÓN DE EXTRACCIÓN DE EMAILS
# ==============================================================================

EMAIL_REGEX = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')

# Emails genéricos a ignorar - VALIDACIÓN ESTRICTA (permite Gmail, Yahoo, etc para PyMEs)
EMAILS_IGNORAR = {
    'example@example.com', 'test@test.com', 'admin@admin.com',
    'info@example.com', 'contact@example.com', 'noreply@',
    'no-reply@', 'webmaster@', 'postmaster@', '@sentry.io',
    '@placeholder', '@example', 'xxx@', 'email@',
    'reservas@reservas', 'info@info', 'contact@contact',
    'admin@', 'root@', 'user@', '@localhost', '@127.0.0.1'
}

# Extensiones de archivo a excluir
EXTENSIONES_ARCHIVO = {
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.rar',
    '.mp4', '.mp3', '.avi', '.mov', '.css', '.js', '.json',
    '.xml', '.txt', '.csv', '.html', '.htm', '.woff', '.ttf'
}

# Dominios sospechosos a excluir
DOMINIOS_SOSPECHOSOS = {
    '2x.png', '3x.png', '1x.png', 'x.png', 'x.jpg', 'x.svg',
    'localhost', '127.0.0.1', 'test.com', 'example.com'
}

# Cadenas grandes a excluir
CADENAS_GRANDES = [
    'starbucks', 'mcdonalds', 
    'cafe martinez', 'café martinez', 'cafemartinez',
    'havanna', 'burger king',
    'bonafide', 'freddo', 'grido', 'subway', 'kentucky', 'kfc', 'pani',
    'la panera rosa', 'mostaza', 'wendys', 'pizza hut', 'dominos',
    'dunkin', 'costa coffee', 'le pain quotidien', 'papa johns'
]

# Plataformas a excluir
PLATAFORMAS_EXCLUIR = [
    'instagram.com', 'facebook.com', 'twitter.com', 'tiktok.com',
    'pedidosya.com', 'rappi.com', 'ubereats.com', 'linktr.ee'
]

HEADERS_HTTP = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

# ==============================================================================
# FUNCIONES DE VALIDACIÓN
# ==============================================================================

def es_email_valido(email: str) -> bool:
    """Valida que el email sea legítimo y no un falso positivo - PERMITE Gmail/Yahoo/etc para PyMEs"""
    if not email:
        return False
    
    email_lower = email.lower()
    
    # Verificar longitud
    if len(email) < 6 or len(email) > 100:
        return False
    
    # Verificar formato básico con regex
    if not EMAIL_REGEX.match(email):
        return False
    
    # Excluir emails genéricos
    for ignorar in EMAILS_IGNORAR:
        if ignorar in email_lower:
            return False
    
    # Excluir si termina con extensión de archivo
    for ext in EXTENSIONES_ARCHIVO:
        if email_lower.endswith(ext):
            return False
    
    # Excluir si el dominio es sospechoso
    if '@' in email:
        dominio = email.split('@')[1].lower()
        for sospechoso in DOMINIOS_SOSPECHOSOS:
            if sospechoso in dominio:
                return False
    
    # VALIDACIONES ADICIONALES MUY ESTRICTAS
    if '@' in email:
        parte_local, parte_dominio = email.split('@')
        
        # 1. Verificar que tenga al menos un punto después del @
        if '.' not in parte_dominio:
            return False
        
        # 2. Verificar que la parte después del último punto tenga al menos 2 caracteres
        tld = parte_dominio.split('.')[-1]
        if len(tld) < 2:
            return False
        
        # 3. [REMOVIDO] Permitir dominios personales (PyMEs los usan mucho)
        # Las PyMEs usan gmail, yahoo, hotmail para sus negocios
        
        # 4. Verificar que el dominio no sea solo números
        dominio_sin_tld = '.'.join(parte_dominio.split('.')[:-1])
        if dominio_sin_tld.replace('.', '').isdigit():
            return False
        
        # 5. Verificar que la parte local tenga contenido válido
        if len(parte_local) < 2:
            return False
        
        # 6. Excluir si la parte local es solo números
        if parte_local.isdigit():
            return False
        
        # 7. Excluir patrones sospechosos en parte local
        patrones_sospechosos = [
            r'^\d{4,}',  # Empieza con 4+ números
            r'^[0-9.]{5,}$',  # Solo números y puntos
            r'image\d+', r'img\d+', r'photo\d+', r'pic\d+',  # Nombres de imágenes
            r'^[a-z]$', r'^[a-z]{1,2}\d+$',  # Una o dos letras seguidas de números
        ]
        
        for patron in patrones_sospechosos:
            if re.match(patron, parte_local):
                return False
        
        # 8. Verificar que el dominio tenga al menos 4 caracteres antes del TLD
        if len(dominio_sin_tld) < 4:
            return False
    
    # Excluir emails que parecen ser rutas de archivos
    if '/' in email or '\\' in email:
        return False
    
    # Excluir emails con caracteres sospechosos múltiples
    if email.count('@') != 1:
        return False
    
    # Excluir emails con muchos números consecutivos
    if re.search(r'\d{5,}', email):
        return False
    
    # Solo aceptar si parece un email corporativo real
    return True


def es_cadena_grande(titulo: str, dominio: str) -> bool:
    """Verifica si es una cadena grande"""
    import unicodedata
    
    texto = f"{titulo} {dominio}".lower()
    texto_normalizado = ''.join(
        c for c in unicodedata.normalize('NFD', texto)
        if unicodedata.category(c) != 'Mn'
    )
    
    texto_normalizado = ' '.join(texto_normalizado.split())
    
    for cadena in CADENAS_GRANDES:
        cadena_normalizada = ''.join(
            c for c in unicodedata.normalize('NFD', cadena)
            if unicodedata.category(c) != 'Mn'
        )
        
        if cadena_normalizada in texto_normalizado:
            return True
        
        cadena_sin_espacios = cadena_normalizada.replace(' ', '')
        if cadena_sin_espacios in texto_normalizado.replace(' ', ''):
            return True
    
    return False


def es_plataforma_excluir(url: str, dominio: str) -> bool:
    """Verifica si es una plataforma a excluir"""
    texto = f"{url} {dominio}".lower()
    return any(plat in texto for plat in PLATAFORMAS_EXCLUIR)

# ==============================================================================
# EXTRACCIÓN DE EMAILS
# ==============================================================================

def extraer_emails_de_html(html: str) -> Set[str]:
    """Extrae emails de HTML"""
    emails = set()
    
    try:
        soup = BeautifulSoup(html, 'html.parser')
        
        # Buscar en texto visible
        texto = soup.get_text()
        matches = EMAIL_REGEX.findall(texto)
        for email in matches:
            email_limpio = email.strip().lower()
            if es_email_valido(email_limpio):
                emails.add(email_limpio)
        
        # Buscar en enlaces mailto:
        for link in soup.find_all('a', href=True):
            href = link['href']
            if href.startswith('mailto:'):
                email = href.replace('mailto:', '').split('?')[0].strip().lower()
                if es_email_valido(email):
                    emails.add(email)
    
    except Exception as e:
        logger.debug(f"Error parseando HTML: {str(e)[:50]}")
    
    return emails


def extraer_emails_de_url(url: str, timeout: int = 10) -> Set[str]:
    """Extrae emails de una URL"""
    emails = set()
    
    try:
        response = requests.get(url, headers=HEADERS_HTTP, timeout=timeout, allow_redirects=True)
        response.raise_for_status()
        
        if 'text/html' in response.headers.get('Content-Type', '').lower():
            emails = extraer_emails_de_html(response.text)
    
    except Exception as e:
        logger.debug(f"Error obteniendo {url}: {str(e)[:50]}")
    
    return emails

# ==============================================================================
# CARGA DE DATOS
# ==============================================================================

def cargar_todos_los_negocios() -> List[Dict[str, Any]]:
    """Carga todos los negocios de los archivos JSON"""
    logger.info("📂 Cargando negocios de archivos JSON...")
    
    todos_los_negocios = []
    
    for archivo in ARCHIVOS_JSON:
        ruta_archivo = OUTPUT_DIR / archivo
        if not ruta_archivo.exists():
            logger.warning(f"   ⚠️  Archivo no encontrado: {archivo}")
            continue
        
        logger.info(f"   📄 Cargando: {archivo}")
        try:
            with open(ruta_archivo, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Extraer items de los resultados de DataForSEO
            items = []
            if 'tasks' in data:
                for task in data['tasks']:
                    if 'result' in task and task['result']:
                        items.extend(task['result'][0].get('items', []))
            
            logger.info(f"      ✅ {len(items)} negocios cargados")
            todos_los_negocios.extend(items)
            
        except Exception as e:
            logger.error(f"      ❌ Error cargando {archivo}: {str(e)}")
    
    logger.info(f"📊 Total negocios cargados: {len(todos_los_negocios)}")
    
    # Ordenar por rating y cantidad de reviews (mejores primero)
    todos_los_negocios.sort(
        key=lambda x: (
            x.get('rating', {}).get('value', 0),
            x.get('rating', {}).get('votes_count', 0)
        ),
        reverse=True
    )
    
    return todos_los_negocios


def procesar_negocio_para_email(negocio: Dict[str, Any]) -> Dict[str, Any]:
    """Procesa un negocio específicamente para extracción de emails"""
    titulo = negocio.get('title', '')
    url = negocio.get('url', '')
    dominio = negocio.get('domain', '')
    
    # Crear registro base
    registro = {
        'titulo': titulo,
        'categoria': negocio.get('category', ''),
        'telefono': negocio.get('phone', ''),
        'direccion': negocio.get('address', ''),
        'ciudad': negocio.get('address_info', {}).get('city', ''),
        'rating': negocio.get('rating', {}).get('value', ''),
        'cantidad_reviews': negocio.get('rating', {}).get('votes_count', 0),
        'url': url,
        'dominio': dominio,
        'place_id': negocio.get('place_id', ''),
        'emails': '',
        'tiene_web_propia': bool(url and not es_plataforma_excluir(url, dominio)),
        'es_cadena': es_cadena_grande(titulo, dominio),
        'fecha_extraccion': datetime.now().isoformat(),
    }
    
    # Saltar si es cadena grande
    if registro['es_cadena']:
        logger.debug(f"⏭️  Saltando cadena: {titulo}")
        return registro
    
    # Extraer emails solo si tiene web propia
    if url and registro['tiene_web_propia']:
        logger.info(f"📧 Extrayendo emails: {titulo}")
        try:
            emails = extraer_emails_de_url(url, timeout=15)
            if emails:
                registro['emails'] = ', '.join(sorted(emails))
                logger.info(f"   ✅ {len(emails)} email(s): {registro['emails']}")
            else:
                logger.info(f"   ℹ️  Sin emails")
        except Exception as e:
            logger.warning(f"   ⚠️  Error: {str(e)[:50]}")
    else:
        if not url:
            logger.debug(f"   ℹ️  Sin URL: {titulo}")
        elif not registro['tiene_web_propia']:
            logger.debug(f"   ℹ️  Solo redes sociales: {titulo}")
    
    return registro


def eliminar_duplicados_y_guardar(registros: List[Dict[str, Any]]) -> None:
    """Elimina duplicados AGRESIVAMENTE por múltiples criterios y guarda el CSV final"""
    logger.info("\n" + "="*80)
    logger.info("🗑️  ELIMINANDO DUPLICADOS AGRESIVAMENTE")
    logger.info("="*80)
    
    # Crear DataFrame
    df = pd.DataFrame(registros)
    
    if len(df) == 0:
        logger.warning("⚠️  No hay registros para guardar")
        return
    
    logger.info(f"📊 Total registros antes de limpiar: {len(df)}")
    
    import unicodedata
    
    def normalizar_titulo(titulo):
        """Normalizar título de forma agresiva para detectar duplicados"""
        if pd.isna(titulo):
            return ""
        # Remover acentos
        titulo_norm = ''.join(
            c for c in unicodedata.normalize('NFD', str(titulo).lower())
            if unicodedata.category(c) != 'Mn'
        )
        # Remover caracteres especiales, números, y palabras comunes
        titulo_norm = re.sub(r'[^\w\s]', '', titulo_norm)
        titulo_norm = re.sub(r'\d+', '', titulo_norm)  # Remover números
        titulo_norm = re.sub(r'\b(sucursal|local|branch|store|tienda|restaurant|bar|cafe|coffee|parrilla|grill)\b', '', titulo_norm)
        titulo_norm = re.sub(r'\b(palermo|belgrano|recoleta|san telmo|puerto madero|villa crespo|barracas)\b', '', titulo_norm)  # Remover barrios
        titulo_norm = ' '.join(titulo_norm.split())
        return titulo_norm.strip()
    
    def normalizar_email(email):
        """Normalizar email para detectar duplicados"""
        if pd.isna(email) or not email:
            return ""
        # Tomar solo el primer email si hay múltiples
        primer_email = email.split(',')[0].strip().lower()
        return primer_email
    
    # Crear columnas normalizadas
    df['titulo_normalizado'] = df['titulo'].apply(normalizar_titulo)
    df['email_principal'] = df['emails'].apply(normalizar_email)
    
    # 1. Eliminar duplicados por place_id
    antes = len(df)
    df = df.drop_duplicates(subset=['place_id'], keep='first')
    dup_place_id = antes - len(df)
    if dup_place_id > 0:
        logger.info(f"   🗑️  Eliminados {dup_place_id} duplicados por place_id")
    
    # 2. Eliminar duplicados por email (si tienen el mismo email, es el mismo negocio)
    antes = len(df)
    df_con_email = df[df['email_principal'] != ''].copy()
    df_sin_email = df[df['email_principal'] == ''].copy()
    
    if len(df_con_email) > 0:
        # Ordenar por rating antes de eliminar duplicados por email
        df_con_email = df_con_email.sort_values(
            by=['rating', 'cantidad_reviews'],
            ascending=[False, False]
        )
        df_con_email = df_con_email.drop_duplicates(subset=['email_principal'], keep='first')
        dup_email = antes - len(df_con_email) - len(df_sin_email)
        if dup_email > 0:
            logger.info(f"   🗑️  Eliminados {dup_email} duplicados por email")
    
    df = pd.concat([df_con_email, df_sin_email], ignore_index=True)
    
    # 3. Eliminar duplicados por título normalizado (mismo nombre = mismo negocio)
    antes = len(df)
    # Filtrar títulos que no estén vacíos después de la normalización
    df_con_titulo = df[df['titulo_normalizado'] != ''].copy()
    df_sin_titulo = df[df['titulo_normalizado'] == ''].copy()
    
    if len(df_con_titulo) > 0:
        # Ordenar por rating antes de eliminar duplicados por título
        df_con_titulo = df_con_titulo.sort_values(
            by=['rating', 'cantidad_reviews'],
            ascending=[False, False]
        )
        df_con_titulo = df_con_titulo.drop_duplicates(subset=['titulo_normalizado'], keep='first')
        dup_titulo = antes - len(df_con_titulo) - len(df_sin_titulo)
        if dup_titulo > 0:
            logger.info(f"   🗑️  Eliminados {dup_titulo} duplicados por nombre normalizado")
    
    df = pd.concat([df_con_titulo, df_sin_titulo], ignore_index=True)
    
    # 4. Eliminar duplicados por título normalizado + teléfono (para casos edge)
    antes = len(df)
    df['_dup_id'] = (
        df['titulo_normalizado'].fillna('') + '|' + 
        df['telefono'].fillna('') + '|' +
        df['dominio'].fillna('')
    )
    
    # Ordenar por rating antes de eliminar duplicados finales
    df = df.sort_values(
        by=['rating', 'cantidad_reviews'],
        ascending=[False, False]
    )
    
    df = df.drop_duplicates(subset=['_dup_id'], keep='first')
    dup_final = antes - len(df)
    if dup_final > 0:
        logger.info(f"   🗑️  Eliminados {dup_final} duplicados finales por combinación múltiple")
    
    # 5. FILTRO FINAL: Solo mantener registros con email válido
    antes = len(df)
    df = df[df['emails'] != ''].copy()  # Solo los que tienen email
    sin_email = antes - len(df)
    if sin_email > 0:
        logger.info(f"   🗑️  Eliminados {sin_email} registros sin email (solo queremos con email)")
    
    # Limpiar columnas temporales
    df = df.drop(columns=['titulo_normalizado', 'email_principal', '_dup_id'], errors='ignore')
    
    # Ordenar resultado final por rating
    df = df.sort_values(
        by=['rating', 'cantidad_reviews'],
        ascending=[False, False]
    ).reset_index(drop=True)
    
    # Guardar CSV
    df.to_csv(CSV_FINAL, index=False, encoding='utf-8')
    logger.info(f"✅ CSV guardado: {CSV_FINAL}")
    logger.info(f"   Total registros finales: {len(df)}")
    
    # Estadísticas detalladas y completas
    logger.info("\n" + "="*80)
    logger.info("📊 ESTADÍSTICAS FINALES DETALLADAS")
    logger.info("="*80)
    
    if len(df) > 0:
        # Estadísticas básicas
        logger.info(f"   🎯 Total negocios únicos:      {len(df)}")
        logger.info(f"   📧 Todos tienen email:         {len(df)} (100%)")
        logger.info(f"   🌐 Con web propia:             {df['tiene_web_propia'].sum()}")
        logger.info(f"   🏪 Cadenas grandes:            {df['es_cadena'].sum()}")
        logger.info(f"   ⭐ Rating promedio:            {df['rating'].mean():.2f}")
        logger.info(f"   📊 Reviews promedio:           {df['cantidad_reviews'].mean():.0f}")
        
        # Análisis de emails por dominio
        logger.info(f"\n   📧 ANÁLISIS DE EMAILS:")
        logger.info(f"      Emails únicos totales:      {df['emails'].nunique()}")
        
        # Extraer dominios de emails
        dominios = []
        for emails_str in df['emails'].dropna():
            for email in emails_str.split(','):
                email = email.strip()
                if '@' in email:
                    dominio = email.split('@')[1].lower()
                    dominios.append(dominio)
        
        if dominios:
            from collections import Counter
            dominio_counts = Counter(dominios)
            
            logger.info(f"      Dominios únicos:            {len(dominio_counts)}")
            logger.info(f"\n   🏆 TOP 10 DOMINIOS MÁS USADOS:")
            for dominio, count in dominio_counts.most_common(10):
                porcentaje = (count / len(dominios)) * 100
                logger.info(f"      {dominio:<25} {count:>3} ({porcentaje:4.1f}%)")
        
        # Estadísticas por categoría
        logger.info(f"\n   📂 POR CATEGORÍA:")
        categorias = df['categoria'].value_counts()
        for categoria, count in categorias.head(10).items():
            porcentaje = (count / len(df)) * 100
            logger.info(f"      {categoria:<25} {count:>3} ({porcentaje:4.1f}%)")
        
        # Estadísticas de rating
        logger.info(f"\n   ⭐ DISTRIBUCIÓN DE RATING:")
        rating_ranges = [
            ("5.0 estrellas", len(df[df['rating'] == 5.0])),
            ("4.5-4.9 estrellas", len(df[(df['rating'] >= 4.5) & (df['rating'] < 5.0)])),
            ("4.0-4.4 estrellas", len(df[(df['rating'] >= 4.0) & (df['rating'] < 4.5)])),
            ("3.5-3.9 estrellas", len(df[(df['rating'] >= 3.5) & (df['rating'] < 4.0)])),
            ("< 3.5 estrellas", len(df[df['rating'] < 3.5]))
        ]
        
        for rango, count in rating_ranges:
            if count > 0:
                porcentaje = (count / len(df)) * 100
                logger.info(f"      {rango:<20} {count:>3} ({porcentaje:4.1f}%)")
        
        # Top negocios por rating
        logger.info(f"\n   🥇 TOP 10 NEGOCIOS MEJOR RANKEADOS:")
        top_negocios = df.nlargest(10, 'rating')[['titulo', 'rating', 'cantidad_reviews', 'emails']]
        for idx, row in top_negocios.iterrows():
            email_corto = row['emails'].split(',')[0] if row['emails'] else 'Sin email'
            if len(email_corto) > 30:
                email_corto = email_corto[:27] + '...'
            logger.info(f"      {row['titulo'][:35]:<35} ⭐{row['rating']:.1f} ({row['cantidad_reviews']:>3} rev) {email_corto}")
    
    else:
        logger.warning("   ⚠️  No hay datos para mostrar estadísticas")
    
    logger.info("="*80)


# ==============================================================================
# MAIN
# ==============================================================================

def main():
    """Función principal"""
    logger.info("\n" + "="*80)
    logger.info("🚀 EXTRACCIÓN DIRECTA DE EMAILS - 3000 RESTAURANTES")
    logger.info("="*80)
    logger.info(f"   Límite: {LIMITE_TOTAL} negocios")
    logger.info(f"   Archivo de salida: {CSV_FINAL}")
    logger.info("="*80 + "\n")
    
    # 1. Cargar todos los negocios de los JSON
    negocios = cargar_todos_los_negocios()
    
    if not negocios:
        logger.error("❌ No se encontraron negocios en los archivos JSON")
        return
    
    # 2. Limitar a LIMITE_TOTAL
    if len(negocios) > LIMITE_TOTAL:
        negocios = negocios[:LIMITE_TOTAL]
        logger.info(f"🔢 Limitando a {LIMITE_TOTAL} mejores negocios (por rating)")
    
    # 3. Procesar cada negocio para extraer emails
    logger.info(f"\n🔄 Procesando {len(negocios)} negocios para extraer emails...\n")
    
    registros = []
    procesados_con_web = 0
    emails_encontrados = 0
    
    for i, negocio in enumerate(negocios, 1):
        titulo = negocio.get('title', 'Sin título')
        logger.info(f"\n[{i}/{len(negocios)}] Procesando: {titulo}")
        
        registro = procesar_negocio_para_email(negocio)
        registros.append(registro)
        
        # Contar estadísticas
        if registro['tiene_web_propia']:
            procesados_con_web += 1
        if registro['emails']:
            emails_encontrados += 1
        
        # Mostrar progreso cada 50
        if i % 50 == 0:
            logger.info(f"\n📊 Progreso [{i}/{len(negocios)}]:")
            logger.info(f"   Con web propia: {procesados_con_web}")
            logger.info(f"   Con emails: {emails_encontrados}")
            logger.info(f"   % éxito: {emails_encontrados/procesados_con_web*100 if procesados_con_web > 0 else 0:.1f}%")
        
        # Delay entre requests (más conservador)
        if i < len(negocios):
            time.sleep(1.5)
    
    # 4. Eliminar duplicados y guardar
    eliminar_duplicados_y_guardar(registros)
    
    logger.info("\n" + "="*80)
    logger.info("✅ EXTRACCIÓN COMPLETADA")
    logger.info("="*80)
    logger.info(f"\n📁 Archivo final: {CSV_FINAL}\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logger.warning("\n\n⚠️  Proceso interrumpido por el usuario")
        sys.exit(1)
    except Exception as e:
        logger.error(f"\n\n❌ Error fatal: {str(e)}")
        raise

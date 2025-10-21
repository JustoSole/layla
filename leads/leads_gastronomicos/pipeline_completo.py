#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PIPELINE COMPLETO DE EXTRACCIÓN DE LEADS GASTRONÓMICOS
=======================================================
Sistema unificado que:
1. Busca negocios en DataForSEO
2. Extrae emails de las webs
3. Extrae números de WhatsApp
4. Consolida todo en una base de datos única sin duplicados

Uso:
    python3 pipeline_completo.py --categorias bares restaurantes cafeterias
    python3 pipeline_completo.py --limite 500 --min-rating 4.0
    python3 pipeline_completo.py --skip-emails  # Solo búsqueda y WhatsApp
"""

import sys
import json
import time
import base64
import argparse
import re
import logging
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Set, Optional
from collections import defaultdict

import pandas as pd
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

# Importar config del directorio padre
sys.path.append(str(Path(__file__).parent.parent))
from config import DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD, DATAFORSEO_BASE_URL

# ==============================================================================
# CONFIGURACIÓN GLOBAL
# ==============================================================================

OUTPUT_DIR = Path(__file__).parent / "resultados"
OUTPUT_DIR.mkdir(exist_ok=True)

DB_CONSOLIDADA = OUTPUT_DIR / "base_datos_gastronomica_consolidada.csv"
DB_JSON = OUTPUT_DIR / "base_datos_gastronomica_consolidada.json"

# Coordenadas GPS de CABA
CABA_LAT = -34.6037
CABA_LON = -58.3816
CABA_RADIUS_KM = 20

# Categorías de DataForSEO
CATEGORIAS_DISPONIBLES = {
    "bares": ["bar", "pub", "wine_bar", "cocktail_bar", "sports_bar"],
    "restaurantes": ["restaurant", "meal_takeaway", "meal_delivery"],
    "cafeterias": ["cafe", "coffee_shop"]
}

# Cadenas grandes a excluir
CADENAS_GRANDES = [
    'starbucks', 'mcdonalds', 
    'cafe martinez', 'café martinez', 'cafemartinez',  # Todas las variantes
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

# Configuración de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(OUTPUT_DIR / f'pipeline_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# ==============================================================================
# 1. BÚSQUEDA EN DATAFORSEO
# ==============================================================================

def _get_auth_header() -> Dict[str, str]:
    """Crear header de autenticación para DataForSEO"""
    token = f"{DATAFORSEO_LOGIN}:{DATAFORSEO_PASSWORD}".encode("utf-8")
    b64 = base64.b64encode(token).decode("utf-8")
    return {
        "Authorization": f"Basic {b64}",
        "Content-Type": "application/json"
    }


def buscar_negocios_dataforseo(
    categorias: List[str],
    limite: int = 1000,
    min_rating: float = 3.0
) -> List[Dict[str, Any]]:
    """
    Buscar negocios en DataForSEO.
    """
    logger.info(f"🔍 Buscando negocios en DataForSEO...")
    logger.info(f"   Categorías: {', '.join(categorias)}")
    logger.info(f"   Límite: {limite}")
    logger.info(f"   Rating mínimo: {min_rating}")
    
    location_coord = f"{CABA_LAT},{CABA_LON},{CABA_RADIUS_KM}"
    
    payload = [{
        "location_coordinate": location_coord,
        "categories": categorias,
        "is_claimed": True,
        "filters": [["rating.value", ">", min_rating]],
        "order_by": ["rating.votes_count,desc"],
        "limit": min(limite, 1000)
    }]
    
    headers = _get_auth_header()
    url = f"{DATAFORSEO_BASE_URL}/v3/business_data/business_listings/search/live"
    
    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=120)
        resp.raise_for_status()
        data = resp.json()
        
        if data.get("status_code") == 20000:
            items = []
            for task in data.get("tasks", []):
                result = task.get("result", [])
                if result:
                    items.extend(result[0].get("items", []))
            
            logger.info(f"✅ Encontrados {len(items)} negocios")
            return items
        else:
            logger.error(f"❌ Error: {data.get('status_message')}")
            return []
            
    except Exception as e:
        logger.error(f"❌ Error en búsqueda: {str(e)}")
        return []


# ==============================================================================
# 2. EXTRACCIÓN DE EMAILS
# ==============================================================================

EMAIL_REGEX = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')

# Emails genéricos a ignorar
EMAILS_IGNORAR = {
    'example@example.com', 'test@test.com', 'admin@admin.com',
    'info@example.com', 'contact@example.com', 'noreply@',
    'no-reply@', 'webmaster@', 'postmaster@', '@sentry.io',
    '@placeholder', '@example', 'xxx@', 'email@'
}

# Extensiones de archivo a excluir (no son emails)
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

HEADERS_HTTP = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}


def es_email_valido(email: str) -> bool:
    """Valida que el email sea legítimo y no un falso positivo"""
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
    
    # Verificar que tenga al menos un punto después del @
    if '@' in email:
        parte_dominio = email.split('@')[1]
        if '.' not in parte_dominio:
            return False
        
        # Verificar que la parte después del último punto tenga al menos 2 caracteres
        # (dominios válidos como .com, .ar, etc)
        tld = parte_dominio.split('.')[-1]
        if len(tld) < 2:
            return False
    
    # Excluir emails que parecen ser rutas de archivos
    if '/' in email or '\\' in email:
        return False
    
    # Excluir emails con caracteres sospechosos múltiples
    if email.count('@') != 1:
        return False
    
    # Verificar que no sea un número puro antes del @
    parte_local = email.split('@')[0]
    if parte_local.isdigit():
        return False
    
    # Excluir si tiene números extraños tipo "9075@2x.png"
    if re.match(r'^\d+@\d+x\.(png|jpg|gif|svg)', email_lower):
        return False
    
    # Verificar concatenaciones raras al final del dominio
    # Ej: info@domain.comarav (NO incluir .com.ar que es válido)
    if '@' in email:
        dominio = email.split('@')[1].lower()
        
        # TLDs combinados válidos (no son concatenaciones)
        tlds_combinados_validos = [
            '.com.ar', '.gob.ar', '.org.ar', '.net.ar', '.edu.ar',
            '.co.uk', '.co.nz', '.com.mx', '.com.br', '.com.au'
        ]
        
        # Si tiene un TLD combinado válido, verificar que no haya más texto pegado
        tiene_tld_combinado = any(tld in dominio for tld in tlds_combinados_validos)
        
        if not tiene_tld_combinado:
            # Si después de .com, .net, .org hay texto pegado sin punto, es concatenación
            if re.search(r'\.(com|net|org)[a-z]{2,}', dominio):
                return False
    
    # Verificar números raros al inicio tipo "4131.8028reservas@"
    if '@' in email:
        parte_local = email.split('@')[0]
        # Si empieza con muchos números seguidos de punto y más números
        if re.match(r'^\d{4,}\.\d+', parte_local):
            return False
        
        # Si empieza con números de 4+ dígitos directamente
        if re.match(r'^\d{4,}[a-z]', parte_local.lower()):
            return False
    
    return True


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
# 3. EXTRACCIÓN DE WHATSAPP
# ==============================================================================

def clean_phone_number(phone: str) -> Optional[str]:
    """Limpia número de teléfono"""
    if not phone:
        return None
    
    cleaned = re.sub(r'[\s\-()]', '', phone)
    cleaned = re.sub(r'[^\d+]', '', cleaned)
    digits = re.sub(r'[^\d]', '', cleaned)
    
    if len(digits) < 10:
        return None
    
    return cleaned


def extraer_whatsapp_playwright(url: str, timeout: int = 45) -> Optional[str]:
    """Extrae número de WhatsApp usando Playwright"""
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                viewport={'width': 1920, 'height': 1080}
            )
            page = context.new_page()
            
            page.goto(url, timeout=timeout * 1000, wait_until='domcontentloaded')
            time.sleep(3)
            
            # Buscar enlaces de WhatsApp
            whatsapp_links = page.query_selector_all('a[href*="wa.me"], a[href*="whatsapp"], a[href*="api.whatsapp.com"]')
            
            for link in whatsapp_links:
                href = link.get_attribute('href')
                if href:
                    match = re.search(r'(?:wa\.me/|whatsapp\.com/send\?phone=)(\+?\d+)', href)
                    if match:
                        phone = clean_phone_number(match.group(1))
                        if phone:
                            browser.close()
                            return phone
            
            # Buscar en el contenido de la página
            content = page.content()
            patterns = [
                r'whatsapp[:\s]+([+\d\s\-()]{10,20})',
                r'(\+54\s?9?\s?\d{2,4}\s?\d{3,4}\s?\d{3,4})',
            ]
            
            for pattern in patterns:
                matches = re.findall(pattern, content, re.IGNORECASE)
                for match in matches:
                    phone = clean_phone_number(match)
                    if phone:
                        browser.close()
                        return phone
            
            browser.close()
            
    except Exception as e:
        logger.debug(f"Error extrayendo WhatsApp de {url}: {str(e)[:50]}")
    
    return None


# ==============================================================================
# 4. PROCESAMIENTO Y CONSOLIDACIÓN
# ==============================================================================

def es_cadena_grande(titulo: str, dominio: str) -> bool:
    """Verifica si es una cadena grande"""
    # Normalizar texto: remover acentos y espacios extra
    import unicodedata
    
    texto = f"{titulo} {dominio}".lower()
    texto_normalizado = ''.join(
        c for c in unicodedata.normalize('NFD', texto)
        if unicodedata.category(c) != 'Mn'
    )
    
    # Remover espacios múltiples
    texto_normalizado = ' '.join(texto_normalizado.split())
    
    # Buscar coincidencias
    for cadena in CADENAS_GRANDES:
        # Normalizar cadena también
        cadena_normalizada = ''.join(
            c for c in unicodedata.normalize('NFD', cadena)
            if unicodedata.category(c) != 'Mn'
        )
        
        # Verificar con y sin espacios
        if cadena_normalizada in texto_normalizado:
            return True
        
        # Verificar versión sin espacios (ej: cafemartinez)
        cadena_sin_espacios = cadena_normalizada.replace(' ', '')
        if cadena_sin_espacios in texto_normalizado.replace(' ', ''):
            return True
    
    return False


def es_plataforma_excluir(url: str, dominio: str) -> bool:
    """Verifica si es una plataforma a excluir"""
    texto = f"{url} {dominio}".lower()
    return any(plat in texto for plat in PLATAFORMAS_EXCLUIR)


def procesar_negocio(negocio: Dict[str, Any], extraer_emails: bool = True, extraer_wpp: bool = True) -> Dict[str, Any]:
    """
    Procesa un negocio extrayendo toda la información.
    """
    # Datos básicos de DataForSEO
    titulo = negocio.get('title', '')
    url = negocio.get('url', '')
    dominio = negocio.get('domain', '')
    telefono = negocio.get('phone', '')
    
    # Crear registro base
    registro = {
        'titulo': titulo,
        'categoria': negocio.get('category', ''),
        'telefono': telefono,
        'direccion': negocio.get('address', ''),
        'ciudad': negocio.get('address_info', {}).get('city', ''),
        'codigo_postal': negocio.get('address_info', {}).get('zip', ''),
        'pais': negocio.get('address_info', {}).get('country_code', ''),
        'latitud': negocio.get('latitude', ''),
        'longitud': negocio.get('longitude', ''),
        'rating': negocio.get('rating', {}).get('value', ''),
        'cantidad_reviews': negocio.get('rating', {}).get('votes_count', 0),
        'url': url,
        'dominio': dominio,
        'place_id': negocio.get('place_id', ''),
        'cid': negocio.get('cid', ''),
        'verificado': negocio.get('is_claimed', False),
        'emails': '',
        'whatsapp': telefono if telefono else '',  # Por defecto usar el teléfono de Google
        'tiene_web_propia': bool(url and not es_plataforma_excluir(url, dominio)),
        'es_cadena': es_cadena_grande(titulo, dominio),
        'fecha_extraccion': datetime.now().isoformat(),
    }
    
    # Saltar si es cadena grande
    if registro['es_cadena']:
        logger.debug(f"⏭️  Saltando cadena: {titulo}")
        return registro
    
    # Extraer emails si tiene web propia
    if extraer_emails and url and registro['tiene_web_propia']:
        logger.info(f"📧 Extrayendo emails: {titulo}")
        try:
            emails = extraer_emails_de_url(url, timeout=10)
            if emails:
                registro['emails'] = ', '.join(sorted(emails))
                logger.info(f"   ✅ {len(emails)} email(s): {registro['emails']}")
            else:
                logger.info(f"   ℹ️  Sin emails")
        except Exception as e:
            logger.warning(f"   ⚠️  Error: {str(e)[:50]}")
    
    # Extraer WhatsApp si tiene web propia
    if extraer_wpp and url and registro['tiene_web_propia'] and not registro['whatsapp']:
        logger.info(f"📱 Extrayendo WhatsApp: {titulo}")
        try:
            wpp = extraer_whatsapp_playwright(url, timeout=30)
            if wpp:
                registro['whatsapp'] = wpp
                logger.info(f"   ✅ WhatsApp: {wpp}")
            else:
                logger.info(f"   ℹ️  Sin WhatsApp")
        except Exception as e:
            logger.warning(f"   ⚠️  Error: {str(e)[:50]}")
    
    return registro


def cargar_base_datos_existente() -> pd.DataFrame:
    """Carga la base de datos consolidada si existe"""
    if DB_CONSOLIDADA.exists():
        logger.info(f"📂 Cargando base de datos existente: {DB_CONSOLIDADA}")
        df = pd.read_csv(DB_CONSOLIDADA)
        logger.info(f"   {len(df)} registros existentes")
        return df
    else:
        logger.info("📂 No existe base de datos previa, creando nueva")
        return pd.DataFrame()


def consolidar_y_guardar(registros: List[Dict[str, Any]], db_existente: pd.DataFrame):
    """
    Consolida registros nuevos con la base existente, elimina duplicados y guarda.
    """
    logger.info("\n" + "="*80)
    logger.info("💾 CONSOLIDANDO Y GUARDANDO")
    logger.info("="*80)
    
    # Crear DataFrame de nuevos registros
    df_nuevos = pd.DataFrame(registros)
    
    if len(df_nuevos) == 0:
        logger.warning("⚠️  No hay nuevos registros para guardar")
        return
    
    # Combinar con existente
    if not db_existente.empty:
        df_completo = pd.concat([db_existente, df_nuevos], ignore_index=True)
    else:
        df_completo = df_nuevos
    
    logger.info(f"\n🗑️  ELIMINANDO DUPLICADOS...")
    antes_total = len(df_completo)
    
    # 1. Eliminar duplicados exactos por place_id
    antes = len(df_completo)
    df_completo = df_completo.drop_duplicates(subset=['place_id'], keep='last')
    dup_place_id = antes - len(df_completo)
    if dup_place_id > 0:
        logger.info(f"   Eliminados {dup_place_id} duplicados por place_id")
    
    # 2. Eliminar duplicados de cadenas de forma agresiva
    import unicodedata
    
    def normalizar_titulo(titulo):
        if pd.isna(titulo):
            return ""
        # Remover acentos
        titulo_norm = ''.join(
            c for c in unicodedata.normalize('NFD', str(titulo).lower())
            if unicodedata.category(c) != 'Mn'
        )
        # Remover caracteres especiales, números, espacios extra
        titulo_norm = re.sub(r'[^\w\s]', '', titulo_norm)
        titulo_norm = re.sub(r'\d+', '', titulo_norm)  # Remover números
        titulo_norm = re.sub(r'\b(sucursal|local|branch|store|tienda)\b', '', titulo_norm)  # Remover palabras comunes
        titulo_norm = ' '.join(titulo_norm.split())
        return titulo_norm.strip()
    
    df_completo['titulo_normalizado'] = df_completo['titulo'].apply(normalizar_titulo)
    
    # Separar cadenas de negocios independientes
    df_cadenas = df_completo[df_completo['es_cadena'] == True].copy()
    df_no_cadenas = df_completo[df_completo['es_cadena'] == False].copy()
    
    if len(df_cadenas) > 0:
        antes = len(df_cadenas)
        
        logger.info(f"   🏪 Procesando {antes} locales de cadenas...")
        
        # Ordenar por rating y reviews (mejores primero)
        df_cadenas = df_cadenas.sort_values(
            by=['rating', 'cantidad_reviews'],
            ascending=[False, False]
        )
        
        # ESTRATEGIA AGRESIVA: Solo mantener 1 local por cadena
        # Usar el título normalizado base (sin números ni sucursal)
        df_cadenas = df_cadenas.drop_duplicates(subset=['titulo_normalizado'], keep='first')
        
        dup_cadenas = antes - len(df_cadenas)
        if dup_cadenas > 0:
            logger.info(f"   🗑️  Eliminados {dup_cadenas} duplicados de cadenas")
            logger.info(f"      → Manteniendo solo el local mejor rankeado de cada cadena")
    
    # 3. Combinar de nuevo
    df_completo = pd.concat([df_no_cadenas, df_cadenas], ignore_index=True)
    
    # 4. Eliminar duplicados por teléfono (mismo negocio con distinto place_id)
    # Solo si tienen el mismo título normalizado Y teléfono
    df_con_telefono = df_completo[
        df_completo['telefono'].notna() & 
        (df_completo['telefono'] != '')
    ].copy()
    
    if len(df_con_telefono) > 0:
        antes = len(df_completo)
        
        # Crear identificador compuesto
        df_completo['_dup_check'] = (
            df_completo['titulo_normalizado'].fillna('') + '|' + 
            df_completo['telefono'].fillna('')
        )
        
        # Ordenar por rating antes de eliminar duplicados
        df_completo = df_completo.sort_values(
            by=['rating', 'cantidad_reviews'],
            ascending=[False, False]
        )
        
        # Eliminar duplicados por título+teléfono
        df_completo = df_completo.drop_duplicates(subset=['_dup_check'], keep='first')
        df_completo = df_completo.drop(columns=['_dup_check'])
        
        dup_telefono = antes - len(df_completo)
        if dup_telefono > 0:
            logger.info(f"   Eliminados {dup_telefono} duplicados por título+teléfono")
    
    # Eliminar columna temporal
    df_completo = df_completo.drop(columns=['titulo_normalizado'], errors='ignore')
    
    duplicados_total = antes_total - len(df_completo)
    logger.info(f"   ✅ Total duplicados eliminados: {duplicados_total}\n")
    
    # Ordenar por rating y reviews
    df_completo = df_completo.sort_values(
        by=['rating', 'cantidad_reviews'],
        ascending=[False, False]
    ).reset_index(drop=True)
    
    # Guardar CSV
    df_completo.to_csv(DB_CONSOLIDADA, index=False, encoding='utf-8')
    logger.info(f"✅ CSV guardado: {DB_CONSOLIDADA}")
    logger.info(f"   Total registros: {len(df_completo)}")
    
    # Guardar JSON
    df_completo.to_json(DB_JSON, orient='records', indent=2, force_ascii=False)
    logger.info(f"✅ JSON guardado: {DB_JSON}")
    
    # Estadísticas
    logger.info("\n" + "="*80)
    logger.info("📊 ESTADÍSTICAS DE LA BASE DE DATOS")
    logger.info("="*80)
    logger.info(f"   Total negocios:        {len(df_completo)}")
    logger.info(f"   Con email:             {df_completo['emails'].astype(bool).sum()} ({df_completo['emails'].astype(bool).sum()/len(df_completo)*100:.1f}%)")
    logger.info(f"   Con WhatsApp:          {df_completo['whatsapp'].astype(bool).sum()} ({df_completo['whatsapp'].astype(bool).sum()/len(df_completo)*100:.1f}%)")
    logger.info(f"   Con web propia:        {df_completo['tiene_web_propia'].sum()}")
    logger.info(f"   Cadenas:               {df_completo['es_cadena'].sum()}")
    logger.info(f"   Rating promedio:       {df_completo['rating'].mean():.2f}")
    logger.info("="*80)


# ==============================================================================
# 5. PIPELINE PRINCIPAL
# ==============================================================================

def ejecutar_pipeline(
    categorias: List[str],
    limite: int = 1000,
    min_rating: float = 3.0,
    extraer_emails: bool = True,
    extraer_wpp: bool = True,
    delay: int = 2
):
    """
    Ejecuta el pipeline completo.
    """
    logger.info("\n" + "="*80)
    logger.info("🚀 INICIANDO PIPELINE COMPLETO DE LEADS GASTRONÓMICOS")
    logger.info("="*80)
    logger.info(f"   Categorías: {', '.join(categorias)}")
    logger.info(f"   Límite: {limite}")
    logger.info(f"   Rating mínimo: {min_rating}")
    logger.info(f"   Extraer emails: {extraer_emails}")
    logger.info(f"   Extraer WhatsApp: {extraer_wpp}")
    logger.info("="*80 + "\n")
    
    # 1. Cargar base existente
    db_existente = cargar_base_datos_existente()
    
    # 2. Buscar negocios en DataForSEO
    negocios = buscar_negocios_dataforseo(categorias, limite, min_rating)
    
    if not negocios:
        logger.error("❌ No se encontraron negocios")
        return
    
    # 3. Procesar cada negocio
    logger.info(f"\n🔄 Procesando {len(negocios)} negocios...\n")
    
    registros = []
    for i, negocio in enumerate(negocios, 1):
        logger.info(f"\n[{i}/{len(negocios)}] Procesando: {negocio.get('title', 'Sin título')}")
        
        registro = procesar_negocio(negocio, extraer_emails, extraer_wpp)
        registros.append(registro)
        
        # Guardar progreso cada 10
        if i % 10 == 0:
            consolidar_y_guardar(registros, db_existente)
            db_existente = cargar_base_datos_existente()
            registros = []
        
        # Delay entre requests
        if i < len(negocios):
            time.sleep(delay)
    
    # 4. Guardar registros finales
    if registros:
        consolidar_y_guardar(registros, db_existente)
    
    logger.info("\n" + "="*80)
    logger.info("✅ PIPELINE COMPLETADO")
    logger.info("="*80)
    logger.info(f"\n📁 Base de datos consolidada: {DB_CONSOLIDADA}")
    logger.info(f"📁 Archivo JSON: {DB_JSON}\n")


# ==============================================================================
# MAIN
# ==============================================================================

def main():
    parser = argparse.ArgumentParser(description='Pipeline completo de extracción de leads gastronómicos')
    parser.add_argument('--categorias', nargs='+', choices=['bares', 'restaurantes', 'cafeterias'],
                        default=['bares', 'restaurantes', 'cafeterias'],
                        help='Categorías a buscar')
    parser.add_argument('--limite', type=int, default=1000,
                        help='Límite de resultados por categoría')
    parser.add_argument('--min-rating', type=float, default=3.0,
                        help='Rating mínimo')
    parser.add_argument('--skip-emails', action='store_true',
                        help='No extraer emails')
    parser.add_argument('--skip-whatsapp', action='store_true',
                        help='No extraer WhatsApp')
    parser.add_argument('--delay', type=int, default=2,
                        help='Delay entre requests en segundos')
    
    args = parser.parse_args()
    
    # Expandir categorías
    categorias_expandidas = []
    for cat in args.categorias:
        categorias_expandidas.extend(CATEGORIAS_DISPONIBLES.get(cat, []))
    
    # Ejecutar pipeline
    ejecutar_pipeline(
        categorias=categorias_expandidas,
        limite=args.limite,
        min_rating=args.min_rating,
        extraer_emails=not args.skip_emails,
        extraer_wpp=not args.skip_whatsapp,
        delay=args.delay
    )


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logger.warning("\n\n⚠️  Pipeline interrumpido por el usuario")
        sys.exit(1)
    except Exception as e:
        logger.error(f"\n\n❌ Error fatal: {str(e)}")
        raise


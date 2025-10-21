// CORS Headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Content-Type": "application/json"
};

// Google Places API configuration
const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");

// Helper para generar session token único
function generateSessionToken(): string {
  return crypto.randomUUID();
}

// Diccionario local de tipos -> Español
const TYPE_ES: Record<string, string> = {
  restaurant: "Restaurante",
  cafe: "Cafetería",
  bar: "Bar",
  bakery: "Panadería",
  meal_takeaway: "Comida para llevar",
  clothing_store: "Tienda de ropa",
  electronics_store: "Tienda de electrónica",
  furniture_store: "Mueblería",
  supermarket: "Supermercado",
  department_store: "Tienda por departamentos",
  lawyer: "Estudio jurídico",
  accounting: "Contador",
  real_estate_agency: "Inmobiliaria",
  insurance_agency: "Aseguradora",
  bank: "Banco",
  pharmacy: "Farmacia",
  hardware_store: "Ferretería",
  gas_station: "Estación de servicio",
  beauty_salon: "Salón de belleza",
  hair_care: "Peluquería",
  gym: "Gimnasio",
  lodging: "Alojamiento",
  travel_agency: "Agencia de viajes"
};

function translateTypeToEs(primaryType?: string, types?: string[]): string | null {
  if (primaryType && TYPE_ES[primaryType]) return TYPE_ES[primaryType];
  if (types && types.length) {
    const found = types.find((t) => TYPE_ES[t]);
    if (found) return TYPE_ES[found];
  }
  return primaryType || (types?.[0] ?? null);
}

// Tipos mínimos para respuesta de Autocomplete v1
type StructuredText = { text?: string };
type StructuredFormat = { mainText?: StructuredText; secondaryText?: StructuredText };
type PlacePrediction = {
  placeId: string;
  primaryType?: string;
  types?: string[];
  structuredFormat?: StructuredFormat;
  distanceMeters?: number;
};
type Suggestion = { placePrediction: PlacePrediction };
type AutocompleteResponse = { suggestions?: Suggestion[] };

// Llamada a Google Places Autocomplete (v1) conforme guía
async function getPlaceAutocomplete(
  input: string,
  sessionToken: string,
  opts?: {
    countryCodes?: string[]; // default ["AR"]
    primaryTypes?: string[]; // <=5
    languageCode?: string; // default "es-AR"
    locationRestriction?: {
      rectangle?: { low:{latitude:number, longitude:number}, high:{latitude:number, longitude:number} };
      circle?: { center:{latitude:number, longitude:number}, radius:number };
    };
    origin?: { latitude:number, longitude:number };
  }
): Promise<AutocompleteResponse> {
  if (!GOOGLE_MAPS_API_KEY) throw new Error("GOOGLE_MAPS_API_KEY not configured");

  const url = "https://places.googleapis.com/v1/places:autocomplete";

  const headers = {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
    "X-Goog-FieldMask": [
      "suggestions.placePrediction.placeId",
      "suggestions.placePrediction.types",
      "suggestions.placePrediction.structuredFormat.mainText",
      "suggestions.placePrediction.structuredFormat.secondaryText",
      "suggestions.placePrediction.distanceMeters"
    ].join(",")
  };

  const body: Record<string, unknown> = {
    input: input.trim(),
    sessionToken,
    languageCode: opts?.languageCode ?? "es-AR",
    includedRegionCodes: opts?.countryCodes?.length ? opts.countryCodes : ["AR"],
    includePureServiceAreaBusinesses: false
  };

  if (opts?.primaryTypes?.length) body.includedPrimaryTypes = opts.primaryTypes.slice(0, 5);
  if (opts?.locationRestriction) body.locationRestriction = opts.locationRestriction;
  if (opts?.origin) body.origin = opts.origin;

  const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`Autocomplete error ${response.status}: ${await response.text()}`);
  return await response.json();
}

// Función principal optimizada para velocidad
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { input, sessionToken, vertical, bbox, origin } = await req.json();

    // Validaciones rápidas
    if (!input || typeof input !== 'string') {
      return new Response(JSON.stringify({
        ok: false,
        error: "input is required and must be a string"
      }), { status: 400, headers: corsHeaders });
    }

    const trimmedInput = input.trim();
    if (trimmedInput.length < 2) {
      return new Response(JSON.stringify({
        ok: true,
        suggestions: [],
        message: "Input too short"
      }), { headers: corsHeaders });
    }

    // Usar sessionToken provisto o generar uno nuevo
    const finalSessionToken = sessionToken || generateSessionToken();

    const PRIMARY_TYPES_BY_VERTICAL: Record<string, string[]> = {
      gastronomia: ["restaurant","cafe","bar","bakery","meal_takeaway"],
      retail: ["clothing_store","electronics_store","furniture_store","supermarket","department_store"],
      servicios: ["lawyer","accounting","real_estate_agency","insurance_agency","bank"]
    };

    const primaryTypes = PRIMARY_TYPES_BY_VERTICAL[vertical] ?? undefined;

    const locationRestriction = bbox
      ? { rectangle: { low: bbox.low, high: bbox.high } }
      : undefined;

    const autocompleteResult = await getPlaceAutocomplete(trimmedInput, finalSessionToken, {
      countryCodes: ["AR"],
      primaryTypes,
      languageCode: "es-AR",
      locationRestriction,
      origin
    });

    const suggestions = autocompleteResult.suggestions ?? [];

    const formattedSuggestions = suggestions.map((s: Suggestion) => {
      const p = s.placePrediction;
      const description = [p.structuredFormat?.mainText?.text, p.structuredFormat?.secondaryText?.text]
        .filter(Boolean).join(", ");
      return {
        placeId: p.placeId,
        description,
        structured_formatting: {
          main_text: p.structuredFormat?.mainText?.text ?? "",
          secondary_text: p.structuredFormat?.secondaryText?.text ?? ""
        },
        primaryType: p.primaryType ?? null,
        types: p.types ?? [],
        type_es: translateTypeToEs(p.primaryType, p.types),
        distanceMeters: p.distanceMeters ?? null,
        sessionToken: finalSessionToken
      };
    });

    console.log(`✅ Found ${formattedSuggestions.length} suggestions`);

    return new Response(JSON.stringify({
      ok: true,
      suggestions: formattedSuggestions,
      sessionToken: finalSessionToken,
      query: trimmedInput,
      count: formattedSuggestions.length
    }), { headers: corsHeaders });

  } catch (error) {
    console.error("❌ Autocomplete error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({
      ok: false,
      error: message,
      suggestions: []
    }), { status: 500, headers: corsHeaders });
  }
});

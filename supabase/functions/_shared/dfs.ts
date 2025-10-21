const BASE = "https://api.dataforseo.com/v3";
const USER = Deno.env.get("DATAFORSEO_LOGIN")!;
const PASS = Deno.env.get("DATAFORSEO_PASSWORD")!;

// 🚀 DEBUG: Log credentials status
console.log('🔍 DataForSEO Config:', {
  hasUser: !!USER,
  hasPass: !!PASS,
  userPreview: USER ? USER.substring(0, 10) + '...' : 'MISSING'
});

function authHeaders() {
  const token = btoa(`${USER}:${PASS}`);
  return { Authorization: `Basic ${token}` };
}

// 🗑️ MOCK DATA ELIMINADO - Solo datos reales de DataForSEO

async function dfsPost(path: string, body: unknown) {
  // 🚀 SOLO MODO REAL - Sin mock data
  console.log(`🌐 DataForSEO API Call: ${path}`, body);
  
  const headers = { "Content-Type": "application/json", ...authHeaders() };
  console.log('🔑 Auth headers prepared:', { hasAuth: !!headers.Authorization });
  
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error(`❌ DataForSEO Error ${res.status}:`, errorText);
    throw new Error(`DataForSEO POST ${path} ${res.status}: ${errorText}`);
  }
  
  const result = await res.json();
  const priority = (body as any)?.[0]?.priority || 1;
  const priorityText = priority === 2 ? "🚀 HIGH" : "⚡ NORMAL";
  console.log(`✅ DataForSEO POST Success (${priorityText} PRIORITY):`, {
    status: result.status_code,
    tasks: result.tasks_count,
    task_id: result.tasks?.[0]?.id || "N/A",
    priority: priority
  });  
  return result;
}

// --- Google: My Business Info (usar cid o place_id en keyword)
export async function postMyBusinessInfoByCid(cid: string, location_code: number, language_code = "es", priority = 1) {
  return await dfsPost("/business_data/google/my_business_info/task_post", [{
    keyword: `cid:${cid}`, location_code, language_code, priority
  }]);
}

export async function postMyBusinessInfoByPlaceId(place_id: string, location_name: string, language_code = "es", priority = 1) {
  return await dfsPost("/business_data/google/my_business_info/task_post", [{
    keyword: `place_id:${place_id}`, location_name, language_code, priority
  }]);
}

// --- Google: Reviews (FIXED - usar location_name y depth múltiplos de 10)
export async function postGoogleReviewsByCid(cid: string, location_name: string, language_code = "es", depth = 20, priority = 2) {
  // Asegurar depth es múltiplo de 10 (facturación DataForSEO)
  const adjustedDepth = Math.max(10, Math.ceil(depth / 10) * 10);
  console.log(`📊 Adjusted depth from ${depth} to ${adjustedDepth} (multiple of 10)`);
  
  return await dfsPost("/business_data/google/reviews/task_post", [{
    keyword: `cid:${cid}`, 
    location_name, 
    language_code, 
    depth: adjustedDepth,
    priority // 🚀 Priority 2 para mayor velocidad (default)
  }]);
}

// --- Tripadvisor: Reviews (recomiendan url_path)  :contentReference[oaicite:5]{index=5}
export async function postTripadvisorReviewsByUrlPath(url_path: string, location_code: number, depth = 20, priority = 2) {
  return await dfsPost("/business_data/tripadvisor/reviews/task_post", [{
    url_path, location_code, depth, priority // 🚀 Priority 2 para mayor velocidad (default)
  }]);
}

// === FUNCIONES GET PARA OBTENER RESULTADOS ===

// GET functions para obtener resultados usando task_id
export async function getMyBusinessInfo(task_id: string) {
  const headers = { "Content-Type": "application/json", ...authHeaders() };
  const res = await fetch(`${BASE}/business_data/google/my_business_info/task_get/${task_id}`, {
    method: "GET",
    headers
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`DataForSEO GET my_business_info ${res.status}: ${errorText}`);
  }
  
  return await res.json();
}

// === FUNCIONES TASKS_READY COMO FALLBACK ===

export async function getGoogleReviewsTasksReady() {
  const headers = { "Content-Type": "application/json", ...authHeaders() };
  const res = await fetch(`${BASE}/business_data/google/reviews/tasks_ready`, { 
    method: "GET",
    headers 
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`DataForSEO GET google_reviews tasks_ready ${res.status}: ${errorText}`);
  }
  
  return await res.json();
}

export async function getTripadvisorReviewsTasksReady() {
  const headers = { "Content-Type": "application/json", ...authHeaders() };
  const res = await fetch(`${BASE}/business_data/tripadvisor/reviews/tasks_ready`, { 
    method: "GET",
    headers 
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`DataForSEO GET tripadvisor_reviews tasks_ready ${res.status}: ${errorText}`);
  }
  
  return await res.json();
}

export async function getMyBusinessInfoTasksReady() {
  const headers = { "Content-Type": "application/json", ...authHeaders() };
  const res = await fetch(`${BASE}/business_data/google/my_business_info/tasks_ready`, { 
    method: "GET",
    headers 
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`DataForSEO GET my_business_info tasks_ready ${res.status}: ${errorText}`);
  }
  
  return await res.json();
}

export async function getGoogleReviews(task_id: string) {
  const headers = { "Content-Type": "application/json", ...authHeaders() };
  const res = await fetch(`${BASE}/business_data/google/reviews/task_get/${task_id}`, {
    method: "GET",
    headers
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`DataForSEO GET google_reviews ${res.status}: ${errorText}`);
  }
  
  return await res.json();
}

export async function getTripadvisorReviews(task_id: string) {
  const headers = { "Content-Type": "application/json", ...authHeaders() };
  const res = await fetch(`${BASE}/business_data/tripadvisor/reviews/task_get/${task_id}`, {
    method: "GET",
    headers
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`DataForSEO GET tripadvisor_reviews ${res.status}: ${errorText}`);
  }
  
  return await res.json();
}

// === FUNCIÓN DE POLLING GENÉRICA ===

export async function pollTask(
  getFunction: (task_id: string) => Promise<any>,
  task_id: string,
  maxWaitSec = 300, // 🕐 Aumentado a 5 minutos para my_business_info
  sleepSec = 10      // 🕐 Aumentado a 10 segundos entre polls para my_business_info
): Promise<any> {
  console.log(`🔄 Polling task ${task_id} (max ${maxWaitSec}s, poll every ${sleepSec}s)`);
  
  const deadline = Date.now() + (maxWaitSec * 1000);
  let lastResult = null;
  let pollCount = 0;
  
  while (Date.now() < deadline) {
    try {
      pollCount++;
      lastResult = await getFunction(task_id);
      const tasks = lastResult?.tasks || [];
      
      if (tasks.length > 0) {
        const task = tasks[0];
        const statusCode = task.status_code;
        const resultCount = task.result_count || 0;
        const hasResults = task.result && task.result.length > 0;
        
        // 📊 Status code meanings:
        // 20000 = Success/Complete
        // 40601 = Task handed (normal - keep waiting)  
        // 40602 = Task queued (normal - keep waiting)
        // 5xxxx = Terminal errors
        let statusMessage = "";
        if (statusCode === 20000) statusMessage = "✅ SUCCESS";
        else if (statusCode === 40601) statusMessage = "⏳ TASK HANDED (waiting...)";
        else if (statusCode === 40602) statusMessage = "⏳ TASK QUEUED (waiting...)";
        else if (statusCode === 20100) statusMessage = "⏳ TASK CREATED (waiting...)";
        else if (statusCode === 40001) statusMessage = "⏳ TASK PROCESSING (waiting...)";
        else if (statusCode >= 50000) statusMessage = "❌ TERMINAL ERROR";
        else statusMessage = `⏳ STATUS ${statusCode} (waiting...)`;
        
        console.log(`📊 Poll #${pollCount} - ${statusMessage} | ResultCount: ${resultCount} | HasResults: ${hasResults}`);
        
        // 🔍 LOGGING DETALLADO PARA DIAGNOSTICO
        console.log('🔎 Task complete details:', {
          status_code: statusCode,
          status_message: task.status_message || 'N/A',
          result_count: resultCount,
          task_id: task_id
        });
        
        if (task.result && task.result.length > 0) {
          const res0 = task.result[0];
          console.log('📦 Result metadata:', {
            title: res0.title || 'N/A',
            items_count: res0.items_count || 0,
            check_url: res0.check_url || 'N/A'
          });
        }
        
        // ✅ TASK COMPLETA: status_code es 20000 
        if (statusCode === 20000) {
          if (resultCount > 0 || hasResults) {
            console.log(`🎉 Task ${task_id} SUCCESS WITH DATA! Results: ${resultCount || task.result?.length || 0}`);
          } else {
            console.log(`✅ Task ${task_id} SUCCESS (no data found for this query)`);
          }
          return lastResult;
        }
        
        // ❌ ERROR TERMINAL: códigos 5xxxx
        if (statusCode && statusCode >= 50000) {
          console.error(`💥 Task ${task_id} TERMINAL ERROR: ${statusCode} - ${task.status_message}`);
          return lastResult;
        }
        
        // ⏳ ESTADOS INTERMEDIOS: 40601, 40602, 20100, 40001, etc.
        // → CONTINUAR ESPERANDO (no hacer return)
      }
      
      const remainingSec = Math.ceil((deadline - Date.now()) / 1000);
      console.log(`⏳ Task ${task_id} still processing... (poll #${pollCount}, ${remainingSec}s left)`);
      
    } catch (error) {
      console.warn(`⚠️ GET failed on poll #${pollCount} (retrying): ${error}`);
    }
    
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, sleepSec * 1000));
  }
  
  console.warn(`⏰ Task ${task_id} TIMEOUT after ${maxWaitSec}s (${pollCount} polls)`);
  return lastResult || { tasks: [] };
}

// === FUNCIONES CONVENIENTES POST + POLL ===

export async function postAndPollGoogleReviews(
  cid: string, 
  location_name: string,
  language_code = "es", 
  depth = 20,
  maxWaitSec = 180 // Reducido a 3 minutos para mejor UX
) {
  console.log(`🚀 Starting Google Reviews task for CID: ${cid} in ${location_name}`);
  
  // 1. POST con location_name (más tolerante que location_code) y priority=2 para velocidad
  const postResult = await postGoogleReviewsByCid(cid, location_name, language_code, depth, 2);
  const task_id = postResult?.tasks?.[0]?.id;
  
  if (!task_id) {
    throw new Error("No task_id received from DataForSEO POST");
  }
  
  console.log(`📋 Task created: ${task_id}`);
  
  // 2. POLL con timeout reducido y polling más frecuente para velocidad
  const result = await pollTask(getGoogleReviews, task_id, maxWaitSec, 6); // 6 segundos entre polls
  
  // 3. FALLBACK CON TASKS_READY (fix crítico del senior)
  const status = result?.tasks?.[0]?.status_code;
  if (status !== 20000) {
    console.warn(`🟡 Poll no llegó a SUCCESS (status=${status}). Intentando tasks_ready fallback...`);
    try {
      const ready = await getGoogleReviewsTasksReady();
      const readyIds = ready?.tasks?.map((t: any) => t.id) || [];
      console.log(`🧾 tasks_ready found: ${readyIds.length} tasks`, readyIds.slice(0, 5));
      
      if (readyIds.includes(task_id)) {
        console.log(`🔁 task_id ${task_id} está en ready list; intentando GET directo`);
        return await getGoogleReviews(task_id);
      } else {
        console.log(`❌ task_id ${task_id} NOT found in ready list`);
      }
    } catch (fallbackError) {
      console.error('❌ Tasks_ready fallback failed:', fallbackError);
    }
  }
  
  return result;
}

export async function postAndPollTripadvisorReviews(
  url_path: string,
  location_code: number, 
  depth = 20,
  maxWaitSec = 150 // Reducido a 2.5 minutos para mejor UX
) {
  console.log(`🚀 Starting TripAdvisor Reviews task for: ${url_path}`);
  
  // 1. POST con priority=2 para mayor velocidad
  const postResult = await postTripadvisorReviewsByUrlPath(url_path, location_code, depth, 2);
  const task_id = postResult?.tasks?.[0]?.id;
  
  if (!task_id) {
    throw new Error("No task_id received from DataForSEO POST");
  }
  
  console.log(`📋 Task created: ${task_id}`);
  
  // 2. POLL con polling más frecuente para velocidad
  return await pollTask(getTripadvisorReviews, task_id, maxWaitSec, 6); // 6 segundos entre polls
}

// 🏢 POST + POLL My Business Info (FIXED - con tasks_ready fallback)
export async function postAndPollMyBusinessInfo(
  keyword: string,
  location_code?: number,
  location_name?: string, 
  language_code = "es",
  priority = 1,
  maxWaitSec = 300 // 🕐 5 minutos para my_business_info (puede tardar más)
): Promise<any> {
  console.log(`🏢 POST+POLL My Business Info: ${keyword} (priority: ${priority})`);
  
  let dfsPost;
  if (keyword.startsWith('place_id:') && location_name) {
    // Use place_id flow
    const place_id = keyword.replace('place_id:', '');
    dfsPost = await postMyBusinessInfoByPlaceId(place_id, location_name, language_code, priority);
  } else if (keyword.startsWith('cid:') && location_code) {
    // Use CID flow  
    const cid = keyword.replace('cid:', '');
    dfsPost = await postMyBusinessInfoByCid(cid, location_code, language_code, priority);
  } else {
    throw new Error("Invalid keyword format. Use 'cid:XXXXX' or 'place_id:XXXXX'");
  }
  
  const task_id = dfsPost?.tasks?.[0]?.id;
  
  if (!task_id) {
    console.error("❌ No task_id from postMyBusinessInfo");
    throw new Error("No task_id received from DataForSEO");
  }
  
  console.log(`📋 My Business Info task created: ${task_id}`);
  
  // 2. POLL con timeout extendido
  const result = await pollTask(getMyBusinessInfo, task_id, maxWaitSec);
  
  // 3. FALLBACK CON TASKS_READY para My Business Info
  const status = result?.tasks?.[0]?.status_code;
  if (status !== 20000) {
    console.warn(`🟡 My Business Info poll no llegó a SUCCESS (status=${status}). Intentando tasks_ready fallback...`);
    try {
      const ready = await getMyBusinessInfoTasksReady();
      const readyIds = ready?.tasks?.map((t: any) => t.id) || [];
      console.log(`🧾 My Business Info tasks_ready found: ${readyIds.length} tasks`);
      
      if (readyIds.includes(task_id)) {
        console.log(`🔁 My Business Info task_id ${task_id} está en ready list; intentando GET directo`);
        return await getMyBusinessInfo(task_id);
      } else {
        console.log(`❌ My Business Info task_id ${task_id} NOT found in ready list`);
      }
    } catch (fallbackError) {
      console.error('❌ My Business Info tasks_ready fallback failed:', fallbackError);
    }
  }
  
  return result;
}

// === FUNCIÓN HELPER PARA VALIDAR/LIMPIAR CID (como sugiere el senior) ===

export async function validateAndCleanCid(
  cid: string, 
  location_name: string, 
  language_code = "es"
): Promise<{ cleanedCid: string; businessInfo: any; isValid: boolean }> {
  console.log(`🧹 Validating CID ${cid} using My Business Info...`);
  
  try {
    // Usar My Business Info para confirmar el CID
    const result = await postAndPollMyBusinessInfo(
      `cid:${cid}`, 
      undefined, 
      location_name, 
      language_code, 
      2 // high priority para validación
    );
    
    const task = result?.tasks?.[0];
    const businessData = task?.result?.[0]?.items?.[0];
    
    if (task?.status_code === 20000 && businessData) {
      console.log(`✅ CID ${cid} is VALID. Business: ${businessData.title}`);
      return {
        cleanedCid: businessData.cid || cid,
        businessInfo: businessData,
        isValid: true
      };
    } else {
      console.log(`❌ CID ${cid} is INVALID or no data found`);
      return {
        cleanedCid: cid,
        businessInfo: null,
        isValid: false
      };
    }
  } catch (error) {
    console.error(`⚠️ Error validating CID ${cid}:`, error);
    return {
      cleanedCid: cid,
      businessInfo: null,
      isValid: false
    };
  }
}

import { apiFetch, getApiBaseUrl } from "@/lib/api/client";

export type AskResponse = {
  answer: string;
  citations: string[];
  refused: boolean;
  reason: string | null;
  limited: boolean;
};

export function isBackendConfigured() {
  return Boolean(getApiBaseUrl());
}

export async function askSage(question: string): Promise<AskResponse> {
  // #region agent log
  fetch('http://127.0.0.1:7310/ingest/1bbb3fe3-4c6d-422f-a4d2-58feb7b2702e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'109532'},body:JSON.stringify({sessionId:'109532',runId:'browser-verify',hypothesisId:'A',location:'ask/api.ts:askSage:entry',message:'askSage called',data:{questionLen:question.length,questionPreview:question.slice(0,120),backendConfigured:isBackendConfigured(),apiBase:Boolean(getApiBaseUrl())},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  try {
    const result = await apiFetch<AskResponse>("/ask", {
      method: "POST",
      body: JSON.stringify({ question }),
    });
    // #region agent log
    fetch('http://127.0.0.1:7310/ingest/1bbb3fe3-4c6d-422f-a4d2-58feb7b2702e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'109532'},body:JSON.stringify({sessionId:'109532',runId:'browser-verify',hypothesisId:'C',location:'ask/api.ts:askSage:success',message:'askSage response',data:{refused:result.refused,reason:result.reason,limited:result.limited,citationCount:result.citations?.length??0,citations:result.citations,answerPreview:(result.answer||'').slice(0,300)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return result;
  } catch (err) {
    // #region agent log
    fetch('http://127.0.0.1:7310/ingest/1bbb3fe3-4c6d-422f-a4d2-58feb7b2702e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'109532'},body:JSON.stringify({sessionId:'109532',runId:'browser-verify',hypothesisId:'B',location:'ask/api.ts:askSage:error',message:'askSage threw',data:{name:err instanceof Error?err.name:'unknown',status:err && typeof err==='object'&&'status' in err?(err as {status:number}).status:null,message:err instanceof Error?err.message.slice(0,200):String(err)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    throw err;
  }
}

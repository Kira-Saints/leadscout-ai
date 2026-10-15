import os, sys, time
from collections import defaultdict, deque
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from backend import ai
from backend.schemas import (AIResult, AnalysisInput, CompanyProfile, OutreachRequest,
                             OutreachResponse, ResearchRequest)
from backend.scraper import fetch_html, parse_html, FetchError
from backend.analysis import build_profile
from backend.outreach import template_email

app = FastAPI(title="LeadScout AI")
_hits: dict[str, deque] = defaultdict(deque)
LIMIT, WINDOW = 15, 60  # best-effort only: in-memory, per serverless instance

class ApiError(Exception):
    def __init__(self, msg: str, code: str, status: int):
        self.msg, self.code, self.status = msg, code, status

@app.exception_handler(ApiError)
async def _api_error(_: Request, e: ApiError):
    return JSONResponse({"error": e.msg, "code": e.code}, status_code=e.status)

@app.exception_handler(RequestValidationError)
async def _invalid(_: Request, e: RequestValidationError):
    return JSONResponse({"error": "Please check your input.", "code": "invalid_input"}, status_code=422)

def limit(request: Request) -> None:
    ip = (request.headers.get("x-forwarded-for") or "unknown").split(",")[0].strip()
    q, now = _hits[ip], time.time()
    while q and now - q[0] > WINDOW:
        q.popleft()
    if len(q) >= LIMIT:
        raise ApiError("Too many requests, try again shortly.", "rate_limited", 429)
    q.append(now)

def _ai_status(code: str) -> int:
    return {"ai_disabled": 503, "ai_quota": 429}.get(code, 502)

@app.get("/api/health")
def health():
    return {"status": "ok", "ai_available": ai.ai_enabled()}

@app.post("/api/research", response_model=CompanyProfile)
def research(req: ResearchRequest, request: Request):
    limit(request)
    try:
        final_url, html = fetch_html(req.website_url)
    except FetchError as e:
        raise ApiError(str(e), e.code, {"unsafe_url": 400, "timeout": 504, "blocked": 422}.get(e.code, 502))
    return build_profile(req.company_name, final_url, parse_html(html), req.target_service)

@app.post("/api/ai-analysis", response_model=AIResult)
def ai_analysis(req: AnalysisInput, request: Request):
    limit(request)
    try:
        return ai.run_analysis(req)
    except ai.AIError as e:
        raise ApiError(str(e), e.code, _ai_status(e.code))

@app.post("/api/generate-outreach", response_model=OutreachResponse)
def generate_outreach(req: OutreachRequest, request: Request):
    limit(request)
    if req.use_ai:
        try:
            return ai.run_outreach(req)
        except ai.AIError as e:
            raise ApiError(str(e), e.code, _ai_status(e.code))
    subject, body = template_email(req.company_name, req.target_service, req.sender_name)
    return OutreachResponse(subject=subject, body=body, source="template")

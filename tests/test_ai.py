import pytest
from backend import ai
from backend.outreach import template_email
from backend.schemas import AnalysisInput

INP = AnalysisInput(company_name="Acme", website_url="https://a.com")

def test_ai_disabled(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    assert not ai.ai_enabled()
    with pytest.raises(ai.AIError) as e:
        ai.run_analysis(INP)
    assert e.value.code == "ai_disabled"

def test_ai_provider_error_hides_details(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "secret")
    def boom(p): raise RuntimeError("secret leaked")
    monkeypatch.setattr(ai, "_generate", boom)
    with pytest.raises(ai.AIError) as e:
        ai.run_analysis(INP)
    assert "secret" not in str(e.value)

def test_ai_quota_and_bad_json(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    monkeypatch.setattr(ai, "_generate", lambda p: (_ for _ in ()).throw(RuntimeError("429 RESOURCE_EXHAUSTED")))
    with pytest.raises(ai.AIError) as e:
        ai.run_analysis(INP)
    assert e.value.code == "ai_quota"
    monkeypatch.setattr(ai, "_generate", lambda p: "not json")
    with pytest.raises(ai.AIError) as e:
        ai.run_analysis(INP)
    assert e.value.code == "ai_bad_output"

def test_ai_valid(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    monkeypatch.setattr(ai, "_generate", lambda p: '{"summary":"s","opportunities":[{"title":"t","why":"w"}],"email_subject":"x","email_body":"y"}')
    assert ai.run_analysis(INP).source == "ai"

def test_template():
    s, b = template_email("Acme", "SEO", "Sam")
    assert "Acme" in s and "Sam" in b

def test_outreach_endpoint_template_and_ai_disabled(monkeypatch):
    from fastapi.testclient import TestClient
    from api.index import app
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    c = TestClient(app)
    r = c.post("/api/generate-outreach", json={"company_name": "Acme"})
    assert r.status_code == 200 and r.json()["source"] == "template"
    r = c.post("/api/generate-outreach", json={"company_name": "Acme", "use_ai": True})
    assert r.status_code == 503 and r.json()["code"] == "ai_disabled"

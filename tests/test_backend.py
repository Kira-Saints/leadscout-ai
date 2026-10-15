import httpx, pytest
from backend import security
from backend.security import validate_url, UnsafeURLError
from backend.scraper import parse_html, fetch_html, FetchError
from backend.analysis import build_profile

PUBLIC = lambda *a, **k: [(2, 1, 6, "", ("93.184.216.34", 80))]

@pytest.mark.parametrize("u", [
    "http://127.0.0.1", "http://localhost", "http://10.0.0.5", "http://192.168.1.1",
    "http://169.254.169.254/latest/meta-data", "http://[::1]/", "http://[fd00::1]/",
    "http://[::ffff:127.0.0.1]/", "ftp://example.com", "http://user:pw@example.com",
    "http://example.com:22"])
def test_blocked_urls(u):
    with pytest.raises(UnsafeURLError):
        validate_url(u)

def test_public_ok_and_scheme_added(monkeypatch):
    monkeypatch.setattr(security.socket, "getaddrinfo", PUBLIC)
    assert validate_url("example.com") == "https://example.com"

def test_dns_to_private_blocked(monkeypatch):
    monkeypatch.setattr(security.socket, "getaddrinfo", lambda *a, **k: [(2, 1, 6, "", ("10.0.0.1", 80))])
    with pytest.raises(UnsafeURLError):
        validate_url("http://evil.example")

HTML = "<html><head><title>Acme</title><meta name='description' content='We build rockets'><script>x()</script></head><body><h1>Rockets</h1><h2>Launch</h2><p>Hello</p></body></html>"

def test_parse():
    p = parse_html(HTML)
    assert p.title == "Acme" and p.meta_description == "We build rockets"
    assert p.headings == ["Rockets", "Launch"] and "x()" not in p.text_excerpt

def test_parse_empty_and_malformed():
    assert parse_html("").title == ""
    assert parse_html("<h1>unclosed<div>").headings == ["unclosed"]

def _client(handler):
    return httpx.Client(transport=httpx.MockTransport(handler), follow_redirects=False)

def test_redirect_to_metadata_blocked(monkeypatch):
    monkeypatch.setattr(security.socket, "getaddrinfo", PUBLIC)
    h = lambda r: httpx.Response(302, headers={"location": "http://169.254.169.254/"})
    with pytest.raises(FetchError) as e:
        fetch_html("http://example.com", _client(h))
    assert e.value.code == "unsafe_url"

def test_timeout_and_blocked(monkeypatch):
    monkeypatch.setattr(security.socket, "getaddrinfo", PUBLIC)
    def boom(r): raise httpx.ReadTimeout("t")
    with pytest.raises(FetchError) as e:
        fetch_html("http://example.com", _client(boom))
    assert e.value.code == "timeout"
    with pytest.raises(FetchError) as e:
        fetch_html("http://example.com", _client(lambda r: httpx.Response(403)))
    assert e.value.code == "blocked"

def test_fetch_ok(monkeypatch):
    monkeypatch.setattr(security.socket, "getaddrinfo", PUBLIC)
    h = lambda r: httpx.Response(200, text=HTML, headers={"content-type": "text/html"})
    assert "Acme" in fetch_html("http://example.com", _client(h))[1]

def test_profile_suggestions_labelled():
    prof = build_profile("Acme", "https://a.com", parse_html(""), "SEO")
    assert prof.source == "basic" and prof.limitations
    assert all(o.startswith("Suggestion") for o in prof.suggested_opportunities)

def test_api():
    from fastapi.testclient import TestClient
    from api.index import app
    c = TestClient(app)
    assert c.get("/api/health").json()["status"] == "ok"
    assert c.post("/api/research", json={"company_name": "", "website_url": "x"}).status_code == 422
    r = c.post("/api/research", json={"company_name": "A", "website_url": "http://127.0.0.1"})
    assert r.status_code == 400 and r.json()["code"] == "unsafe_url"

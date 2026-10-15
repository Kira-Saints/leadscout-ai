import re
from urllib.parse import urljoin
import httpx
from bs4 import BeautifulSoup
from .schemas import PageData
from .security import validate_url, UnsafeURLError

MAX_BYTES = 1_000_000
MAX_REDIRECTS = 4
TIMEOUT = httpx.Timeout(8.0, connect=4.0)
HEADERS = {"User-Agent": "LeadScoutBot/1.0 (portfolio research tool)", "Accept": "text/html"}

class FetchError(Exception):
    def __init__(self, message: str, code: str):
        super().__init__(message)
        self.code = code

def fetch_html(url: str, client: httpx.Client | None = None) -> tuple[str, str]:
    """Fetch with manual redirects so each hop is re-validated. Returns (final_url, html).

    Limitation: validation and connection resolve DNS separately, so a
    DNS-rebinding race is reduced but not eliminated on serverless.
    """
    own = client is None
    client = client or httpx.Client(timeout=TIMEOUT, headers=HEADERS, follow_redirects=False)
    try:
        current = validate_url(url)
        for _ in range(MAX_REDIRECTS + 1):
            with client.stream("GET", current) as r:
                if r.status_code in (301, 302, 303, 307, 308):
                    loc = r.headers.get("location")
                    if not loc:
                        raise FetchError("Bad redirect", "bad_redirect")
                    current = validate_url(urljoin(current, loc))
                    continue
                if r.status_code in (401, 403, 429):
                    raise FetchError("Site blocked automated access", "blocked")
                if r.status_code >= 400:
                    raise FetchError(f"Site returned HTTP {r.status_code}", "http_error")
                if "html" not in r.headers.get("content-type", "").lower():
                    raise FetchError("Not an HTML page", "not_html")
                buf = bytearray()
                for chunk in r.iter_bytes():
                    buf += chunk
                    if len(buf) > MAX_BYTES:
                        break
                return current, bytes(buf[:MAX_BYTES]).decode(r.encoding or "utf-8", "replace")
        raise FetchError("Too many redirects", "too_many_redirects")
    except UnsafeURLError as e:
        raise FetchError(str(e), "unsafe_url")
    except httpx.TimeoutException:
        raise FetchError("Request timed out", "timeout")
    except httpx.HTTPError:
        raise FetchError("Network error while fetching site", "network_error")
    finally:
        if own:
            client.close()

def parse_html(html: str) -> PageData:
    soup = BeautifulSoup(html[:MAX_BYTES], "html.parser")  # parsing only; never executes JS
    for t in soup(["script", "style", "noscript", "svg", "iframe"]):
        t.decompose()
    title = soup.title.get_text(" ", strip=True) if soup.title else ""
    meta = soup.find("meta", attrs={"name": re.compile("^description$", re.I)})
    desc = (meta.get("content") or "").strip() if meta else ""
    heads: list[str] = []
    for h in soup.find_all(["h1", "h2", "h3"]):
        txt = h.get_text(" ", strip=True)
        if txt and txt not in heads:
            heads.append(txt[:160])
    text = re.sub(r"\s+", " ", soup.get_text(" ", strip=True))
    return PageData(title=title[:200], meta_description=desc[:400],
                    headings=heads[:15], text_excerpt=text[:3000])

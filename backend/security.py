"""SSRF protection. Every URL (including each redirect hop) must pass validate_url."""
import ipaddress
import socket
from urllib.parse import urlsplit

class UnsafeURLError(ValueError):
    pass

BLOCKED_HOSTS = {"localhost", "metadata.google.internal"}

def _check_ip(ip_str: str) -> None:
    ip = ipaddress.ip_address(ip_str)
    if getattr(ip, "ipv4_mapped", None):
        ip = ip.ipv4_mapped
    # is_global is False for private, loopback, link-local (169.254.x.x metadata), reserved, etc.
    if not ip.is_global or ip.is_multicast:
        raise UnsafeURLError("URL resolves to a non-public address")

def validate_url(url: str) -> str:
    """Return a normalized URL or raise UnsafeURLError."""
    url = url.strip()
    if "://" not in url:
        url = "https://" + url
    try:
        parts = urlsplit(url)
        port = parts.port or (443 if parts.scheme == "https" else 80)
    except ValueError:
        raise UnsafeURLError("Invalid URL")
    if parts.scheme not in ("http", "https"):
        raise UnsafeURLError("Only http and https URLs are allowed")
    host = parts.hostname
    if not host or parts.username or parts.password:
        raise UnsafeURLError("Invalid URL")
    if host.lower().rstrip(".") in BLOCKED_HOSTS:
        raise UnsafeURLError("Host is not allowed")
    if port not in (80, 443, 8080, 8443):
        raise UnsafeURLError("Port is not allowed")
    try:
        ipaddress.ip_address(host)
        is_literal = True
    except ValueError:
        is_literal = False
    if is_literal:
        _check_ip(host)
    else:
        try:
            infos = socket.getaddrinfo(host, port, proto=socket.IPPROTO_TCP)
        except socket.gaierror:
            raise UnsafeURLError("Could not resolve host")
        for info in infos:  # reject if ANY record is non-public
            _check_ip(info[4][0])
    return url

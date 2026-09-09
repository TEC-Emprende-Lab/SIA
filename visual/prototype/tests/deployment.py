"""HTTP smoke checks against the built Docker image; standard library only."""
import re
import sys
from urllib.error import HTTPError
from urllib.request import urlopen

base = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8080').rstrip('/')


def get(path):
    with urlopen(base + path, timeout=10) as response:
        return response.status, response.headers, response.read()


status, headers, body = get('/healthz')
assert status == 200 and body == b'ok\n', 'Health endpoint must report OK'
status, headers, html = get('/')
assert status == 200 and b'<div id="root">' in html
assert 'no-cache' in headers.get('Cache-Control', '')
assert headers.get('X-Content-Type-Options') == 'nosniff'
assets = re.findall(r'(?:src|href)="(/assets/[^\"]+)"', html.decode())
assert any(path.endswith('.js') for path in assets)
assert any(path.endswith('.css') for path in assets)
for path in assets:
    status, headers, content = get(path)
    assert status == 200 and content
    assert 'immutable' in headers.get('Cache-Control', '')
    assert 'text/html' not in headers.get('Content-Type', '')
for path in ['/assets/missing.js', '/.env', '/.git/config']:
    try:
        get(path)
    except HTTPError as error:
        assert error.code == 404, (path, error.code)
    else:
        raise AssertionError(f'{path} must return 404')
assert get('/diagnostico')[2] == html, 'SPA fallback must return the entry HTML'
print(f'Deployment OK: health, HTML, {len(assets)} assets, caching, 404 and SPA fallback')

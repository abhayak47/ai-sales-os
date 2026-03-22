from html import unescape
import re
from typing import List

import httpx


def _clean_html(value: str) -> str:
    text = re.sub(r"<[^>]+>", " ", value)
    return re.sub(r"\s+", " ", unescape(text)).strip()


def search_web_briefs(query: str, limit: int = 5) -> List[dict]:
    if not query.strip():
        return []

    try:
        response = httpx.post(
            "https://html.duckduckgo.com/html/",
            data={"q": query},
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=10.0,
            follow_redirects=True,
        )
        response.raise_for_status()
    except Exception:
        return []

    html = response.text
    pattern = re.compile(
        r'<a[^>]*class="[^"]*result__a[^"]*"[^>]*>(?P<title>.*?)</a>.*?'
        r'<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>(?P<snippet>.*?)</a>',
        re.DOTALL,
    )

    results = []
    for match in pattern.finditer(html):
        title = _clean_html(match.group("title"))
        snippet = _clean_html(match.group("snippet"))
        if title or snippet:
            results.append({"title": title, "snippet": snippet, "link": ""})
        if len(results) >= limit:
            break
    return results

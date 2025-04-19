import requests
from typing import Any, Dict, List, Optional

def search_openverse(
    query: str,
    *,
    media_type: str = "audio",
    license: str = "cc0",
    page: int = 1,
    page_size: int = 3,
    include_quotes: bool = True,
    use_tag_collection: bool = False,
    ordering: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Openverse lookup that:
      • Quotes multi‑word queries for exact matches.
      • Uses q= always for keywords (with a fallback if you try tags).
      • Only uses tags= or collection=tag when use_tag_collection=True.
    """
    base_url = f"https://api.openverse.org/v1/{media_type}/"
    def do_request(params: Dict[str, Any]):
        resp = requests.get(base_url, params=params, timeout=5)
        if resp.status_code != 200:
            print(f"Openverse API error {resp.status_code}: {resp.text}")
            return []
        return resp.json().get("results", [])

    # Build the shared params
    shared = {
        "license": license,
        "page": page,
        "page_size": page_size,
    }
    if ordering:
        shared["ordering"] = ordering

    stripped = query.strip()
    # If you explicitly want to browse by tag, use collection=tag
    if use_tag_collection:
        params = {**shared, "collection": "tag", "tag": stripped}
        return do_request(params)

    # Otherwise, always try a q‑search
    if " " in stripped and include_quotes:
        # exact phrase match
        q = f'"{stripped}"'
    else:
        q = stripped
    params = {**shared, "q": q}

    results = do_request(params)

    return [
        {
            "title":        item.get("title"),
            "url":          item.get("url"),
            "landing_page": item.get("foreign_landing_url"),
            "creator":      item.get("creator"),
            "license":      item.get("license"),
            "license_url":  item.get("license_url"),
        }
        for item in results
    ]

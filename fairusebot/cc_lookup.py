# fairusebot/cc_lookup.py
import requests

def search_openverse(query, license="cc0", media_type="audio", categories=None, page_size=3):
    base_url = f"https://api.openverse.org/v1/{media_type}/"
    params = {
        "q": query,
        "license": license,
        "page_size": page_size,
        "page": 1,
    }
    if categories:
        params["categories"] = categories

    response = requests.get(base_url, params=params)
    if response.status_code != 200:
        print("❌ Openverse API error:", response.status_code, response.text)
        return []

    data = response.json().get("results", [])
    return [
        {
            "title": item.get("title"),
            "url": item.get("url"),
            "landing_page": item.get("foreign_landing_url"),
            "creator": item.get("creator"),
            "license": item.get("license"),
            "license_url": item.get("license_url"),
        }
        for item in data
    ]


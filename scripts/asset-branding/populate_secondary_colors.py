import os
import re
import time
import requests
from bs4 import BeautifulSoup
import psycopg2
from dotenv import load_dotenv

# --------------------------------------------------
# Setup
# --------------------------------------------------
load_dotenv()

DEV_DB_URL = os.getenv("DEV_DB_URL")

if not DEV_DB_URL:
    raise RuntimeError("DEV_DB_URL not found in environment")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; AssetColorBot/1.0)"
}

# --------------------------------------------------
# Helpers
# --------------------------------------------------
def normalize_hex(value: str | None) -> str | None:
    if not value:
        return None
    match = re.search(r"#([0-9a-fA-F]{6})", value)
    return f"#{match.group(1)}" if match else None


def scrape_secondary_color(asset_name: str) -> str | None:
    """
    Scrapes top result color from:
    https://teamcolorcodes.com / Wikipedia fallback
    """
    query = f"{asset_name} official secondary color hex"
    url = f"https://www.google.com/search?q={query.replace(' ', '+')}"

    try:
        res = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(res.text, "html.parser")

        # Look for hex color in page text
        text = soup.get_text()
        return normalize_hex(text)

    except Exception as e:
        print(f"⚠️ Scrape failed for {asset_name}: {e}")
        return None


# --------------------------------------------------
# Main
# --------------------------------------------------
def main():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # Fetch assets missing secondary color
    cur.execute("""
        SELECT id, name
        FROM assets
        WHERE secondary_color IS NULL
          AND primary_color IS NOT NULL
    """)

    assets = cur.fetchall()

    print(f"🔍 Found {len(assets)} assets needing secondary color")

    for asset_id, name in assets:
        print(f"→ Fetching secondary color for: {name}")

        color = scrape_secondary_color(name)

        if not color:
            print(f"  ⚠️ No color found, skipping")
            continue

        cur.execute("""
            UPDATE assets
            SET secondary_color = %s,
                updated_at = now()
            WHERE id = %s
        """, (color, asset_id))

        conn.commit()
        print(f"  ✅ Saved {color}")

        time.sleep(1.5)  # be polite to Google

    cur.close()
    conn.close()
    print("🎉 Done")


if __name__ == "__main__":
    main()

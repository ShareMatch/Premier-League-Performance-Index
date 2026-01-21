import os
import json
import argparse
import psycopg2
from dotenv import load_dotenv

# --------------------------------------------------
# Setup
# --------------------------------------------------
load_dotenv()

DATABASE_URL = os.getenv("DEV_DB_URL")
if not DATABASE_URL:
    raise RuntimeError("DEV_DB_URL not set")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(BASE_DIR, "avatar_config.json")

TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")
ICONS_DIR = os.path.join(TEMPLATES_DIR, "icons")
PROJECT_ROOT = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)
DEFAULT_OUTPUT_DIR = os.path.join(PROJECT_ROOT, "public", "avatars")

os.makedirs(DEFAULT_OUTPUT_DIR, exist_ok=True)


# --------------------------------------------------
# Load Config
# --------------------------------------------------
def load_config():
    if not os.path.exists(CONFIG_FILE):
        raise RuntimeError(f"Config file not found: {CONFIG_FILE}")

    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


# --------------------------------------------------
# Helpers
# --------------------------------------------------
def get_initials(name: str) -> str:
    cleaned = "".join(c for c in name if c.isalnum())
    return cleaned[:3].upper()


def fallback_white(value: str | None) -> str:
    return value if value else "#FFFFFF"


# Default mapping from market tokens to asset classes
MARKET_CLASS_MAP = {
    "F1": "motorsport",
    "NBA": "basketball",
    "NFL": "american_football",
    "Eurovision": "music",
    "T20": "cricket",
}


def load_icon(asset_class: str, icon_map: dict) -> str:
    icon_file = icon_map.get(asset_class)

    if not icon_file:
        raise RuntimeError(f"No icon mapping for asset_class '{asset_class}'")

    path = os.path.join(ICONS_DIR, icon_file)

    if not os.path.exists(path):
        raise RuntimeError(f"Icon file not found: {icon_file}")

    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def load_template(asset_class: str) -> str:
    # Try specific template first (check both with and without _avatar suffix)
    candidates = [f"{asset_class}.svg", f"{asset_class}_avatar.svg"]

    for filename in candidates:
        template_path = os.path.join(TEMPLATES_DIR, filename)
        if os.path.exists(template_path):
            return open(template_path, "r", encoding="utf-8").read()

    # Fall back to base template
    base_template_path = os.path.join(TEMPLATES_DIR, "base_avatar.svg")
    if os.path.exists(base_template_path):
        print(f"ℹ️  Using base template for {asset_class}")
        with open(base_template_path, "r", encoding="utf-8") as f:
            return f.read()

    raise RuntimeError(f"No template found for asset_class '{asset_class}'")


def parse_args():
    parser = argparse.ArgumentParser(
        description="Generate trading asset avatars from the reference database."
    )
    parser.add_argument(
        "--market-token",
        dest="market_token",
        help="Optional comma-separated market_token filter (e.g., F1, EPL).",
    )
    parser.add_argument(
        "--output-dir",
        dest="output_dir",
        default=DEFAULT_OUTPUT_DIR,
        help="Directory to write generated SVGs (default: public/avatars).",
    )
    return parser.parse_args()


# --------------------------------------------------
# Main
# --------------------------------------------------
def main():
    args = parse_args()
    output_base_dir = os.path.abspath(args.output_dir)
    os.makedirs(output_base_dir, exist_ok=True)

    market_token_filters = (
        [token.strip() for token in args.market_token.split(",") if token.strip()]
        if args.market_token
        else None
    )

    config = load_config()
    icon_map = config.get("icons", {})
    default_class = config.get("default_class", "football")

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    query = """
        SELECT
            mita.id,
            a.name,
            a.primary_color,
            a.secondary_color,
            mita.avatar_class,
            m.market_token
        FROM market_index_trading_assets mita
        JOIN assets a
          ON a.id = mita.asset_id
        JOIN market_index_seasons mis
          ON mis.id = mita.market_index_season_id
        JOIN market_indexes mi
          ON mi.id = mis.market_index_id
        JOIN markets m
          ON m.id = mi.market_id
        WHERE mita.status IN ('active', 'settled')
    """

    params = []
    if market_token_filters:
        placeholders = ",".join(["%s"] * len(market_token_filters))
        query += f" AND m.market_token IN ({placeholders})"
        params.extend(market_token_filters)

    cur.execute(query, params)

    rows = cur.fetchall()
    print(f"🎨 Found {len(rows)} active trading assets")

    template_cache = {}
    icon_cache = {}

    generated_count = 0

    for (
        trading_asset_id,
        name,
        primary_color,
        secondary_color,
        db_asset_class,
        market_token,
    ) in rows:

        if not market_token:
            print(f"⚠️ Skipping {name} (missing market token)")
            continue

        # Determine Asset Class preference
        asset_class = db_asset_class
        if not asset_class:
            asset_class = MARKET_CLASS_MAP.get(market_token) or default_class

        # Verify we have an icon for this class
        if asset_class not in icon_map:
            print(f"⚠️ Skipping {name} (unknown class '{asset_class}' - no icon mapped)")
            continue

        # For settled assets, colors might be missing, use defaults
        if not primary_color:
            if asset_class == "football":
                primary_color = "#FF0000"  # Default red for football
            elif asset_class == "basketball":
                primary_color = "#FF6600"  # Default orange for basketball
            elif asset_class == "motorsport":
                primary_color = "#FF8000"  # Default orange for motorsport
            else:
                primary_color = "#666666"  # Default gray
            print(f"⚠️ Using default color for {name}: {primary_color}")

        # Load & cache template
        if asset_class not in template_cache:
            try:
                template_cache[asset_class] = load_template(asset_class)
            except RuntimeError as e:
                print(f"❌ Template Error: {e}")
                continue

        # Load & cache icon
        if asset_class not in icon_cache:
            try:
                icon_cache[asset_class] = load_icon(asset_class, icon_map)
            except RuntimeError as e:
                print(f"❌ Icon Error: {e}")
                continue

        template = template_cache[asset_class]
        icon_svg = icon_cache[asset_class]

        output_dir = output_base_dir
        os.makedirs(output_dir, exist_ok=True)

        svg = (
            template.replace("{{PRIMARY_COLOR}}", primary_color)
            .replace("{{SECONDARY_COLOR}}", fallback_white(secondary_color))
            .replace("{{INITIALS}}", get_initials(name))
            .replace("{{INDEX_CODE}}", market_token.upper())
            .replace("{{CENTER_ICON}}", icon_svg)
        )

        filename = f"{trading_asset_id}.svg"
        output_path = os.path.join(output_dir, filename)

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(svg)

        generated_count += 1
        print(f"✅ {asset_class}/{filename}")

    cur.close()
    conn.close()

    print(f"🎉 Generated {generated_count} asset avatars successfully")


# --------------------------------------------------
if __name__ == "__main__":
    main()

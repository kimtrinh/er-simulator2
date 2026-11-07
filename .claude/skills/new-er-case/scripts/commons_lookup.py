#!/usr/bin/env python3
"""Look up a Wikimedia Commons file, check its licence is usable in a paid app, and draft a
media-manifest.json entry.

    python3 commons_lookup.py "File:AoDiss_CT_A-Diss.jpg" --key ct_aortic_dissection \
        --label "CT angiography — aortic dissection with intimal flap" \
        --kw "aortic dissection,intimal flap" [--download media/ct_aortic_dissection.jpg] [--max-edge 1600]

Exit codes: 0 = licence OK, 2 = licence rejected (NC / ND / unknown), 1 = lookup error.
Uses only the standard library (plus Pillow if --download needs resizing).
"""
import argparse
import html
import json
import re
import sys
import urllib.parse
import urllib.request

API = "https://commons.wikimedia.org/w/api.php"
UA = "MediSimCaseBuilder/1.0 (educational ER simulator; https://github.com/kimtrinh/medisim-er)"

# Licences that allow commercial use and modification (we crop / transcode).
OK = [
    (r"^cc0", "CC0", "https://creativecommons.org/publicdomain/zero/1.0/"),
    (r"public ?domain|^pd\b|^pd-", "Public domain", ""),
    (r"^cc[- ]by[- ]sa[- ]?(\d(\.\d)?)", "CC BY-SA {v}", "https://creativecommons.org/licenses/by-sa/{v}"),
    (r"^cc[- ]by[- ]?(\d(\.\d)?)", "CC BY {v}", "https://creativecommons.org/licenses/by/{v}"),
]
BAD = re.compile(r"\bnc\b|non-?commercial|\bnd\b|no-?deriv|fair ?use|all rights reserved", re.I)


def strip_html(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s or "")).strip()


def fetch(title):
    q = {
        "action": "query", "format": "json", "titles": title, "prop": "imageinfo",
        "iiprop": "url|size|mime|extmetadata", "iiurlwidth": "1600",
    }
    req = urllib.request.Request(API + "?" + urllib.parse.urlencode(q), headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.load(r)
    page = next(iter(data["query"]["pages"].values()))
    if "imageinfo" not in page:
        raise SystemExit(f"Not found on Commons: {title}")
    return page["title"], page["imageinfo"][0]


def classify(meta):
    short = strip_html(meta.get("LicenseShortName", {}).get("value", ""))
    code = strip_html(meta.get("License", {}).get("value", ""))
    url = strip_html(meta.get("LicenseUrl", {}).get("value", ""))
    probe = (code or short).lower().replace("_", "-")
    if BAD.search(short) or BAD.search(probe):
        return None, short, url
    for pat, name, lurl in OK:
        m = re.search(pat, probe)
        if m:
            v = m.group(1) if m.groups() else ""
            return name.format(v=v).strip(), short, url or lurl.format(v=v)
    return None, short, url


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("title", help='Commons file title, e.g. "File:Foo.jpg" (a full URL also works)')
    ap.add_argument("--key", required=True, help="manifest key, e.g. xr_free_air")
    ap.add_argument("--label", required=True)
    ap.add_argument("--kw", default="", help="comma-separated keywords")
    ap.add_argument("--file", help="manifest file path (default media/<key>.jpg)")
    ap.add_argument("--download", help="save the image here (resized to --max-edge, EXIF stripped)")
    ap.add_argument("--max-edge", type=int, default=1600)
    a = ap.parse_args()

    title = a.title
    if title.startswith("http"):
        title = urllib.parse.unquote(title.rsplit("/", 1)[-1])
    if not title.startswith("File:"):
        title = "File:" + title
    try:
        title, info = fetch(title)
    except SystemExit:
        raise
    except Exception as e:  # network, proxy, JSON
        print(f"Lookup failed: {e}", file=sys.stderr)
        return 1

    meta = info.get("extmetadata", {})
    lic, raw, lurl = classify(meta)
    artist = strip_html(meta.get("Artist", {}).get("value", "")) or "Unknown"
    credit_line = strip_html(meta.get("Credit", {}).get("value", ""))
    entry = {
        "credit": artist,
        "file": a.file or f"media/{a.key}.jpg",
        "kw": [k.strip() for k in a.kw.split(",") if k.strip()],
        "label": a.label,
        "license": lic or raw,
        "license_url": lurl,
        "page": info.get("descriptionurl", ""),
        "source_title": title,
    }
    print(json.dumps({a.key: entry}, indent=1, ensure_ascii=False))
    print(f"\nsize: {info.get('width')}x{info.get('height')}  mime: {info.get('mime')}", file=sys.stderr)
    if credit_line:
        print(f"source credit line: {credit_line}", file=sys.stderr)
    if not lic:
        print(f"\nREJECTED licence: '{raw}' — needs CC0 / PD / CC BY / CC BY-SA (no NC, no ND).", file=sys.stderr)
        return 2

    if a.download:
        src = info.get("thumburl") or info["url"]
        req = urllib.request.Request(src, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=60) as r:
            raw_bytes = r.read()
        try:
            from io import BytesIO
            from PIL import Image
            im = Image.open(BytesIO(raw_bytes))
            im = im.convert("RGB")
            im.thumbnail((a.max_edge, a.max_edge))
            im.save(a.download, "JPEG", quality=85, optimize=True)  # re-encode drops EXIF
        except ImportError:
            open(a.download, "wb").write(raw_bytes)
            print("Pillow missing: saved original bytes (resize/strip EXIF manually).", file=sys.stderr)
        print(f"saved {a.download}", file=sys.stderr)
    print(f"\nlicence OK: {lic}. Now READ the image and check side/age/hardware/PHI before using it.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Generate or edit an image with the Gemini API (generateContent, image output).

    export GEMINI_API_KEY=...                      # never commit
    export GEMINI_IMAGE_MODEL=gemini-3-pro-image   # optional; default below
    python3 gemini_image.py --prompt "..." --out raw/room-v1.png --aspect 16:9 --size 2K
    python3 gemini_image.py --prompt-file prompts/room.txt --ref scenes/room-young-m.jpg --out raw/room-v1.png
    python3 gemini_image.py --prompt-file prompts/frame3.txt --ref raw/frame2.png --ref raw/clinician.png --out raw/frame3.png

--style prepends the MediSim style bible (references/gemini-art.md). Several --ref images may
be given (consistency / editing). The prompt and settings are saved next to the output as
<out>.prompt.json so every generated asset is reproducible and reviewable.
Standard library only.
"""
import argparse
import base64
import json
import mimetypes
import os
import sys
import urllib.error
import urllib.request

DEFAULT_MODEL = "gemini-3-pro-image"
ENDPOINT = "https://generativelanguage.googleapis.com/v1/models/{model}:generateContent"

STYLE = (
    "Photorealistic documentary photograph inside a modern US emergency department resuscitation bay. "
    "Cool clinical LED lighting with a slight teal cast, shallow depth of field, 35mm lens, natural skin "
    "texture, realistic medical equipment and monitors with no readable text. Staff wear navy or ceil-blue "
    "scrubs, nitrile gloves, no badges with names. No text, captions, watermarks or logos anywhere. The "
    "patient is a fictional adult, not a real or famous individual. Clinically accurate anatomy and device "
    "placement.\n\n"
)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--prompt")
    g.add_argument("--prompt-file")
    ap.add_argument("--ref", action="append", default=[], help="reference / source image (repeatable)")
    ap.add_argument("--out", required=True, help="output path (.png/.jpg/.webp by returned mime)")
    ap.add_argument("--aspect", default="16:9", help='e.g. "16:9", "3:2", "1:1", "2:3"')
    ap.add_argument("--size", default="2K", help='"1K", "2K", "4K" where the model supports it; "" to omit')
    ap.add_argument("--model", default=os.environ.get("GEMINI_IMAGE_MODEL", DEFAULT_MODEL))
    ap.add_argument("--style", action="store_true", help="prepend the MediSim style bible")
    a = ap.parse_args()

    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        print("Set GEMINI_API_KEY (https://aistudio.google.com/apikey).", file=sys.stderr)
        return 1
    prompt = a.prompt if a.prompt is not None else open(a.prompt_file).read()
    if a.style:
        prompt = STYLE + prompt

    parts = [{"text": prompt}]
    for r in a.ref:
        mime = mimetypes.guess_type(r)[0] or "image/png"
        parts.append({"inline_data": {"mime_type": mime, "data": base64.b64encode(open(r, "rb").read()).decode()}})
    img_cfg = {"aspectRatio": a.aspect}
    if a.size:
        img_cfg["imageSize"] = a.size
    body = {"contents": [{"parts": parts}],
            "generationConfig": {"responseModalities": ["TEXT", "IMAGE"], "imageConfig": img_cfg}}

    req = urllib.request.Request(
        ENDPOINT.format(model=a.model), data=json.dumps(body).encode(),
        headers={"x-goog-api-key": key, "Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            data = json.load(r)
    except urllib.error.HTTPError as e:
        msg = e.read().decode(errors="replace")[:800]
        print(f"HTTP {e.code} from {a.model}: {msg}", file=sys.stderr)
        if e.code == 404:
            print("Model name may have changed — check the Gemini image-generation docs and set GEMINI_IMAGE_MODEL.",
                  file=sys.stderr)
        if e.code == 400 and "imageSize" in msg:
            print("This model may not support --size; retry with --size ''.", file=sys.stderr)
        return 1

    text, saved = [], None
    for cand in data.get("candidates", []):
        for p in cand.get("content", {}).get("parts", []):
            inl = p.get("inlineData") or p.get("inline_data")
            if inl and not saved:
                out = a.out
                ext = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}.get(inl.get("mimeType", ""), "")
                if ext and not out.lower().endswith(ext) and not out.lower().endswith(".jpeg"):
                    out = os.path.splitext(out)[0] + ext
                os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
                open(out, "wb").write(base64.b64decode(inl["data"]))
                saved = out
            elif p.get("text"):
                text.append(p["text"])
    if not saved:
        fb = data.get("promptFeedback") or data.get("candidates", [{}])[0].get("finishReason")
        print(f"No image returned ({fb}). Model text: {' '.join(text)[:500]}", file=sys.stderr)
        return 1
    json.dump({"model": a.model, "aspect": a.aspect, "size": a.size, "refs": a.ref, "prompt": prompt,
               "model_text": " ".join(text)}, open(saved + ".prompt.json", "w"), indent=1)
    print(saved)
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env bash
# Transcode an openly licensed ultrasound clip into the app's cine format.
#
#   transcode_us_clip.sh <source video> <out-prefix> [crop] [start] [duration]
#   transcode_us_clip.sh lung.ogv media/usv_lung_point "crop=640:480:120:40" 2 5
#
# Produces <out-prefix>.webm (VP9, no audio, <=720 px wide, short loop) and <out-prefix>.jpg
# (poster frame from the middle of the clip, also usable as the hotspotted still).
# Crop away burned-in text (PHI, dates, hospital names) and any annotation that gives the
# answer away. Read the finding on the poster before adding it to media-manifest.json.
set -euo pipefail
src=${1:?source video}; out=${2:?out prefix e.g. media/usv_key}
crop=${3:-}; start=${4:-0}; dur=${5:-5}
command -v ffmpeg >/dev/null || { echo "ffmpeg not installed" >&2; exit 1; }

vf="${crop:+$crop,}scale='min(720,iw)':-2,fps=24"
ffmpeg -y -loglevel error -ss "$start" -t "$dur" -i "$src" -an -vf "$vf" \
  -c:v libvpx-vp9 -b:v 0 -crf 36 -row-mt 1 -deadline good "$out.webm"
mid=$(awk "BEGIN{print $dur/2}")
ffmpeg -y -loglevel error -ss "$mid" -i "$out.webm" -frames:v 1 -q:v 3 "$out.jpg"
printf '%s  %s KB\n%s  %s KB\n' "$out.webm" $(( $(stat -c%s "$out.webm" 2>/dev/null || stat -f%z "$out.webm") / 1024 )) \
  "$out.jpg" $(( $(stat -c%s "$out.jpg" 2>/dev/null || stat -f%z "$out.jpg") / 1024 ))
echo "Add video, video_poster and video_* licence fields to media-manifest.json; keep the clip <= 6 s and <= 600 KB."

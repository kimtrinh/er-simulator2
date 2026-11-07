# <case-id> — review sheet

Case: "<title>" · <age> <sex> · true dx: <diagnosis> · built YYYY-MM-DD · status: **experimental (Kim review pending)**

## Clinical content
- [ ] Intro undifferentiated (reads as 4–6 conditions; no dx named or foreshadowed)
- [ ] Critical actions (each cites evidence.md row):
  1. <action> — [#]
- [ ] Learning points (each cites evidence.md row)
- [ ] Doses checked against source, weight/age-appropriate: <drug dose — [#]>
- [ ] Offline responders cover history, exam regions, key labs/imaging, every critical action, consults, disposition
- [ ] Recent practice changes surfaced: <…>

## Real medical images / clips
| key | modality | licence | credit | source page | one-line read of THIS image | side/age/hardware/PHI | hotspots | Kim |
|---|---|---|---|---|---|---|---|---|
| xr_… | XR | CC BY-SA 4.0 | … | … | … | ✓ ✓ ✓ ✓ | 2 (grid) | pending |

## AI-generated assets (Gemini)
| file | purpose | model | prompt file | refs | checks (age, pair match, devices, no dx leak, no text) | Kim |
|---|---|---|---|---|---|---|
| scenes/room-case-<id>.jpg | room | gemini-3-pro-image | prompts/room.txt | room-<base>.jpg | | pending |

## Procedure sprites / animations
| kind | frames | size KB | anchor (ax,ay → zone zx,zy) | landmark correct on bases | reduced motion | Codex diff reviewed |
|---|---|---|---|---|---|---|

## Intro reel
| shot | still | from → to | turns | no dx leak | pediatric rule |
|---|---|---|---|---|---|

## QA
- [ ] Repo tests pass (`<command>` → <result>)
- [ ] Played offline end to end; screenshots in `qa/`
- [ ] clinical-provenance.json updated; approval left pending

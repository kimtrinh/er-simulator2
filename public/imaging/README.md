# Reference imaging

Real films the simulator shows in trauma cases when the player orders the
matching study (see `data/imagingLibrary.ts`). A film only comes up once the
patient has what it shows — the chest-tube films after a chest tube is placed,
the ETT film after intubation, the binder film after a pelvic binder is applied.

| File | Shown for | Status |
| --- | --- | --- |
| `cxr-ett-chest-tube.jpg` | Chest X-ray after a chest tube **and** intubation | included |
| `cxr-chest-tube.jpg` | Chest X-ray after a chest tube, not intubated | add a file |
| `pelvis-xray-binder.jpg` | AP pelvis after a pelvic binder | add a file |
| `echo-subxiphoid.jpg` | Bedside echo | add a file |

To add a film, drop a JPEG/PNG in this folder under the name above. Nothing else
needs to change: the app checks which files exist when it loads. If the new
film shows something different from the `findings` text for its entry in
`data/imagingLibrary.ts`, edit that text so the radiology report matches the
picture, and fill in its `credit`. Use only images you are licensed to publish —
this repository is public.

## Credits

- `cxr-ett-chest-tube.jpg` — Case courtesy of Dr Muhammad Imran Khan,
  [Radiopaedia.org](https://radiopaedia.org/cases/75526), rID 75526, licensed
  [CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/).
  Obtained via the [COVID-19 image data collection](https://github.com/ieee8023/covid-chestxray-dataset);
  resized and converted to greyscale, and shared under the same licence.

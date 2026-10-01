# Groove Box

Touch instruments on a small stage. Play them, record what you play into loops, and take the result to a
[YuE2](https://github.com/multimodal-art-projection/YuE) render as ABC notation or as a score PNG.

**Live:** https://unlimitedediting.github.io/GrooveBox/

No musical notation needed: every melodic instrument is locked to the chosen key and scale, drums are a drawn kit,
chords are one tap. The notation is generated for you, and the advanced grid is one tap away when you want it.

## Pages

| Page | What it is |
|---|---|
| `index.html` | **The stage.** A one-screen, touch-first deck of instruments. Each instrument pairs a sound with a controller and a role. |
| `editor.html` | **The score editor.** Step grids for drums and the sung line, chord pads per bar, the song's sections, live notation, exports. |
| `studio.html` | **The Score Studio** (copy from ComfyUI-YuE2Fast): view, play, rearrange and edit a YuE2 score; add lyrics and style. |

All three share one project, autosaved in the browser, with a named library and JSON import/export.

## Instruments

A deck entry is **sound × controller × role**. Assemble your own with "+ Add".

- **Sounds**: General MIDI presets played by FluidSynth — voice, choir, finger and synth bass, two drum kits, electric
  piano, kalimba, marimba, vibraphone, steel drums, harp, koto, nylon guitar, flute, sax, trumpet, strings, pad, leads,
  agogo, woodblock, taiko.
- **Controllers**: scale keys · 4×4 pads · drawn drum kit · strings to pluck or strum · slide pad (left-right pitch,
  up louder) · drifting note bubbles · chord pads. Each controller lists which roles it can drive.
- **Roles** decide where recorded notes land: the **voice** (sung line, monophonic), the **bass** line, the **drums**,
  the bar's **chord**, or an extra **layer** that is heard on stage and exported only in the standard ABC.

Press ● and play along; notes snap to the grid and take their length from how long you hold.

## Export

- **ABC** in YuE2's own dialect (`% section`, `V: Vocal`, `V: Ins`): melody as the vocal line with chord symbols, bass
  from what you played on a bass instrument or derived from kick (root) and snare (fifth) over the bar's chord.
  Flavours: melody + chords (planning `full`), melody only (planning `melody`), and standard multi-voice ABC with every
  instrument and a percussion staff.
- **Score PNG**: the score, style and lyrics packed as `song.yue2.json` in a lossless **M3DS** image (the container
  from [Meshsmuggler](https://github.com/UnlimitedEditing/Meshsmuggler), byte-compatible with
  ComfyUI-YuE2Fast's `m3ds.py`). Send it to a Graydient `score-yue2` job **as a file**, not a photo: photos get
  recompressed and the CRC check rejects them.
- **Open in Score Studio** hands the score over for lyrics, style and a piano sketch.

## Sound

`groove-synth.js` runs FluidSynth (WebAssembly via js-synthesizer) in an AudioWorklet, with a ScriptProcessor
fallback, playing `vendor/groovebox-gm.sf3` — a 3 MB, 27-preset subset of MuseScore's FluidR3Mono_GM SoundFont built
with `tools/build-soundfont.js`. A small oscillator engine covers the first seconds and any failure to load.
It is a sketch of the score, not YuE2's performance.

## Hosting

Static files; nothing to build. The included GitHub Actions workflow deploys the repository root to GitHub Pages on
every push to `main` (it enables Pages on first run). Any static host works.

## Licence

MIT for the Groove Box's own code. Bundled components keep their licences: FluidSynth (LGPL-2.1), js-synthesizer
(BSD-3-Clause), FluidR3 SoundFont (MIT). See `THIRD_PARTY_NOTICES.md`.

# Third-party notices

- **FluidSynth** compiled to WebAssembly by [fluidsynth-emscripten](https://github.com/jet2jet/fluidsynth-emscripten):
  `vendor/libfluidsynth-2.3.0-with-libsndfile.js`. Copyright (c) 2003-2022 Peter Hanappe and others, **LGPL v2.1**.
  Full text: `licenses/fluidsynth-LGPL-2.1.txt`. Shipped unmodified as a separate file and loaded at runtime, so it can
  be replaced with another build.
- **js-synthesizer** 1.10.0: `vendor/js-synthesizer.js`, `vendor/js-synthesizer.worklet.js`. Copyright (c) 2018 jet,
  **BSD-3-Clause**. Full text: `licenses/js-synthesizer-BSD-3-Clause.txt`.
- **FluidR3 GM SoundFont**: `vendor/groovebox-gm.sf3` is a 27-preset subset of `FluidR3Mono_GM.sf3` as distributed with
  MuseScore 3.6.2, derived from Frank Wen's FluidR3 GM, **MIT**. Full text: `licenses/FluidR3-MIT.txt`.
  Rebuild it with `tools/build-soundfont.js` (needs `spessasynth_core`, Apache-2.0, not shipped).
- **pako** and **abcjs** are loaded from jsDelivr at runtime (MIT); nothing of theirs is redistributed here.
- `studio.html` is a copy of the YuE2 Score Studio from
  [ComfyUI-YuE2Fast](https://github.com/UnlimitedEditing/ComfyUI-YuE2Fast) (`docs/index.html`), kept here so the
  hand-off between pages works on one origin.

/* YuE2 Groove Box — shared core: project model, music tables, ABC export, score checks, storage, sequencer.
   Used by stage.html (instrument stage) and groovebox.html (score editor). Plain script, exposes window.Groove. */
(function () {
"use strict";
const uid = () => Math.random().toString(36).slice(2, 9);
const clone = o => JSON.parse(JSON.stringify(o));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// ---------- music tables ----------
const LETTERS = "CDEFGAB", NATURAL = [0, 2, 4, 5, 7, 9, 11];
const KEYS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const MINOR_KEYS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "G#", "A", "Bb", "B"];
const FIFTHS = { C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, "F#": 6, "C#": 7, F: -1, Bb: -2, Eb: -3, Ab: -4, Db: -5, Gb: -6, Cb: -7 };
const SHARP_ORDER = "FCGDAEB", FLAT_ORDER = "BEADGCF";
const ACC_TEXT = { 2: "^^", 1: "^", 0: "=", "-1": "_", "-2": "__" };
const SCALES = {
  major:      { label: "Major (happy)",           steps: [0, 2, 4, 5, 7, 9, 11], minor: false },
  minor:      { label: "Minor (moody)",           steps: [0, 2, 3, 5, 7, 8, 10], minor: true },
  pentatonic: { label: "Pentatonic (can't miss)", steps: [0, 2, 4, 7, 9], minor: false, parent: "major" },
  minorpent:  { label: "Minor pentatonic",        steps: [0, 3, 5, 7, 10], minor: true, parent: "minor" },
  blues:      { label: "Blues",                   steps: [0, 3, 5, 6, 7, 10], minor: true, parent: "minor" },
  dorian:     { label: "Dorian (afro-funk)",      steps: [0, 2, 3, 5, 7, 9, 10], minor: true },
  mixolydian: { label: "Mixolydian (highlife)",   steps: [0, 2, 4, 5, 7, 9, 10], minor: false },
};
// Drum lanes: id, label, colour, General MIDI key, ABC percussion-staff pitch (+ notehead) for the standard export.
const DRUMS = [
  { id: "kick",   label: "Kick",      color: "#d9534f", gm: 36, perc: "F" },
  { id: "snare",  label: "Snare",     color: "#e3842a", gm: 38, perc: "c" },
  { id: "rim",    label: "Rim",       color: "#c76b3a", gm: 37, perc: "d", head: "x" },
  { id: "clap",   label: "Clap",      color: "#c9a227", gm: 39, perc: "e", head: "triangle" },
  { id: "hat",    label: "Hi-hat",    color: "#2a9d8f", gm: 42, perc: "g", head: "x" },
  { id: "ohat",   label: "Open hat",  color: "#3a86c8", gm: 46, perc: "a", head: "x" },
  { id: "tom",    label: "Tom",       color: "#8e5bd9", gm: 45, perc: "A" },
  { id: "lowtom", label: "Low tom",   color: "#6d48b5", gm: 41, perc: "G" },
  { id: "shaker", label: "Shaker",    color: "#7a9a3a", gm: 70, perc: "b", head: "x" },
  { id: "crash",  label: "Crash",     color: "#b58b2a", gm: 49, perc: "f", head: "x" },
];
const DRUM_BY_ID = Object.fromEntries(DRUMS.map(d => [d.id, d]));
const SECTION_TYPES = ["intro", "verse", "prechorus", "chorus", "postchorus", "bridge", "interlude", "solo", "breakdown", "outro"];

// Sounds available on the stage (presets in groovebox-gm.sf3, a subset of FluidR3Mono_GM). role = where its notes land.
const SOUNDS = [
  { id: "oohs",    name: "Voice (oohs)",     program: 53,  role: "voice" },
  { id: "choir",   name: "Choir",            program: 52,  role: "voice" },
  { id: "fbass",   name: "Finger bass",      program: 33,  role: "bass" },
  { id: "sbass",   name: "Synth bass",       program: 38,  role: "bass" },
  { id: "kit",     name: "Drum kit",         program: 0,   role: "drums", drumkit: true },
  { id: "kit808",  name: "808 drum machine", program: 25,  role: "drums", drumkit: true },
  { id: "epiano",  name: "Electric piano",   program: 4,   role: "layer" },
  { id: "kalimba", name: "Kalimba",          program: 108, role: "layer" },
  { id: "marimba", name: "Marimba",          program: 12,  role: "layer" },
  { id: "vibes",   name: "Vibraphone",       program: 11,  role: "layer" },
  { id: "steel",   name: "Steel drums",      program: 114, role: "layer" },
  { id: "harp",    name: "Harp",             program: 46,  role: "layer" },
  { id: "koto",    name: "Koto",             program: 107, role: "layer" },
  { id: "guitar",  name: "Nylon guitar",     program: 24,  role: "layer" },
  { id: "flute",   name: "Flute",            program: 73,  role: "layer" },
  { id: "sax",     name: "Alto sax",         program: 65,  role: "layer" },
  { id: "trumpet", name: "Trumpet",          program: 56,  role: "layer" },
  { id: "strings", name: "Strings",          program: 48,  role: "layer" },
  { id: "pad",     name: "Dream pad",        program: 88,  role: "layer" },
  { id: "square",  name: "Square lead",      program: 80,  role: "layer" },
  { id: "saw",     name: "Saw lead",         program: 81,  role: "layer" },
  { id: "agogo",   name: "Agogo bells",      program: 113, role: "layer" },
  { id: "wood",    name: "Woodblock",        program: 115, role: "layer" },
  { id: "taiko",   name: "Taiko",            program: 116, role: "layer" },
  { id: "riser",   name: "Riser (sweep up)",  program: -1,  role: "fx", fx: true },
  { id: "fall",    name: "Downlifter",        program: -2,  role: "fx", fx: true },
  { id: "impact",  name: "Impact",            program: -3,  role: "fx", fx: true },
];
const GM_NAMES = ["Acoustic Grand Piano", "Bright Acoustic Piano", "Electric Grand Piano", "Honky-tonk Piano", "Electric Piano 1", "Electric Piano 2", "Harpsichord", "Clavinet",
  "Celesta", "Glockenspiel", "Music Box", "Vibraphone", "Marimba", "Xylophone", "Tubular Bells", "Dulcimer",
  "Drawbar Organ", "Percussive Organ", "Rock Organ", "Church Organ", "Reed Organ", "Accordion", "Harmonica", "Tango Accordion",
  "Nylon Guitar", "Steel Guitar", "Jazz Guitar", "Clean Electric Guitar", "Muted Electric Guitar", "Overdriven Guitar", "Distortion Guitar", "Guitar Harmonics",
  "Acoustic Bass", "Finger Bass", "Pick Bass", "Fretless Bass", "Slap Bass 1", "Slap Bass 2", "Synth Bass 1", "Synth Bass 2",
  "Violin", "Viola", "Cello", "Contrabass", "Tremolo Strings", "Pizzicato Strings", "Harp", "Timpani",
  "String Ensemble 1", "String Ensemble 2", "Synth Strings 1", "Synth Strings 2", "Choir Aahs", "Voice Oohs", "Synth Voice", "Orchestra Hit",
  "Trumpet", "Trombone", "Tuba", "Muted Trumpet", "French Horn", "Brass Section", "Synth Brass 1", "Synth Brass 2",
  "Soprano Sax", "Alto Sax", "Tenor Sax", "Baritone Sax", "Oboe", "English Horn", "Bassoon", "Clarinet",
  "Piccolo", "Flute", "Recorder", "Pan Flute", "Blown Bottle", "Shakuhachi", "Whistle", "Ocarina",
  "Square Lead", "Saw Lead", "Calliope Lead", "Chiff Lead", "Charang Lead", "Voice Lead", "Fifths Lead", "Bass + Lead",
  "New Age Pad", "Warm Pad", "Polysynth Pad", "Choir Pad", "Bowed Pad", "Metallic Pad", "Halo Pad", "Sweep Pad",
  "Rain", "Soundtrack", "Crystal", "Atmosphere", "Brightness", "Goblins", "Echoes", "Sci-Fi",
  "Sitar", "Banjo", "Shamisen", "Koto", "Kalimba", "Bagpipe", "Fiddle", "Shanai",
  "Tinkle Bell", "Agogo", "Steel Drums", "Woodblock", "Taiko Drum", "Melodic Tom", "Synth Drum", "Reverse Cymbal",
  "Guitar Fret Noise", "Breath Noise", "Seashore", "Bird Tweet", "Telephone Ring", "Helicopter", "Applause", "Gunshot"];
const GM_FAMILIES = ["Piano", "Chromatic percussion", "Organ", "Guitar", "Bass", "Strings", "Ensemble", "Brass", "Reed", "Pipe", "Synth lead", "Synth pad", "Synth effects", "Ethnic", "Percussive", "Sound effects"];
const GM_KITS = [[0, "Standard kit"], [8, "Room kit"], [16, "Power kit"], [24, "Electronic kit"], [25, "TR-808"], [32, "Jazz kit"], [40, "Brush kit"], [48, "Orchestra kit"]];
const STAGE_PROGRAMS = new Set(SOUNDS.filter(s => !s.drumkit).map(s => s.program)), STAGE_KITS = new Set([0, 25]);
// Every General MIDI program as a sound ("gm12"), plus every kit ("kit8"); the stage set covers a subset of these.
const GM_SOUNDS = GM_NAMES.map((name, program) => ({ id: "gm" + program, name, program, role: program >= 32 && program <= 39 ? "bass" : [52, 53, 54, 85].includes(program) ? "voice" : "layer", family: GM_FAMILIES[Math.floor(program / 8)], full: !STAGE_PROGRAMS.has(program) }))
  .concat(GM_KITS.map(([program, name]) => ({ id: "kit" + program, name, program, role: "drums", drumkit: true, family: "Drum kits", full: !STAGE_KITS.has(program) })));
const SOUND_BY_ID = Object.fromEntries(SOUNDS.concat(GM_SOUNDS).map(s => [s.id, s]));
// Nearest stage-set stand-in for a program the small SoundFont doesn't hold (same GM family where possible).
const STAGE_STANDIN = { 0: 4, 1: 4, 2: 4, 3: 4, 5: 4, 6: 4, 7: 4, 8: 11, 9: 11, 10: 11, 13: 12, 14: 11, 15: 108, 16: 4, 17: 4, 18: 4, 19: 88, 20: 88, 21: 4, 22: 73, 23: 4,
  25: 24, 26: 24, 27: 24, 28: 24, 29: 81, 30: 81, 31: 24, 32: 33, 34: 33, 35: 33, 36: 38, 37: 38, 39: 38, 40: 48, 41: 48, 42: 48, 43: 33, 44: 48, 45: 46, 47: 116,
  49: 48, 50: 48, 51: 88, 54: 53, 55: 48, 57: 56, 58: 56, 59: 56, 60: 56, 61: 56, 62: 81, 63: 81, 64: 65, 66: 65, 67: 65, 68: 73, 69: 73, 70: 65, 71: 73,
  72: 73, 74: 73, 75: 73, 76: 73, 77: 73, 78: 73, 79: 73, 82: 80, 83: 80, 84: 81, 85: 53, 86: 81, 87: 38, 89: 88, 90: 88, 91: 52, 92: 88, 93: 88, 94: 88, 95: 88,
  96: 88, 97: 88, 98: 108, 99: 88, 100: 88, 101: 88, 102: 88, 103: 88, 104: 107, 105: 24, 106: 107, 109: 73, 110: 48, 111: 65, 112: 113, 117: 116, 118: 116, 119: 46,
  120: 115, 121: 73, 122: 88, 123: 73, 124: 113, 125: 116, 126: 115, 127: 116 };
const FULL_SOUNDFONT_URL = "https://raw.githubusercontent.com/musescore/MuseScore/v3.6.2/share/sound/FluidR3Mono_GM.sf3";
// Controllers (input widgets) and which roles they can drive. The stage implements them.
const CONTROLLERS = [
  { id: "keys",    name: "Keys",        blurb: "Big scale keys. Hold for longer notes.",            roles: ["voice", "bass", "layer"] },
  { id: "pads",    name: "Pads",        blurb: "A 4×4 pad bank, drum-machine style.",               roles: ["voice", "bass", "layer", "drums"] },
  { id: "kit",     name: "Drum kit",    blurb: "A drawn kit on stage. Tap the pieces.",              roles: ["drums"] },
  { id: "strings", name: "Strings",     blurb: "Pluck or strum across the strings.",                 roles: ["voice", "bass", "layer"] },
  { id: "xy",      name: "Slide pad",   blurb: "Glide a finger: left-right is pitch, up is louder.", roles: ["voice", "bass", "layer"] },
  { id: "grid",    name: "Light grid",  blurb: "Tap the beats you want lit; the loop sweeps through them.", roles: ["voice", "bass", "layer", "drums"] },
  { id: "rings",   name: "Rings",       blurb: "Concentric rings, low outside to high inside. Tap or drag.", roles: ["voice", "bass", "layer"] },
  { id: "chords",  name: "Chord pads",  blurb: "Strike chords in time, or lay them on the roll and drag a tail to hold longer; the arpeggiator plays them back.", roles: ["chords"] },
  { id: "fxpads",  name: "FX pads",     blurb: "Risers, downlifters and impacts, as long as you hold.",  roles: ["fx"] },
];
const ROLE_LABEL_FX = "Sweeps & hits";
const ROLE_LABEL = { voice: "Voice (the sung line)", bass: "Bass line", drums: "Drums", chords: "Chords", layer: "Extra layer", fx: "Sweeps & hits" };

// ---------- project model ----------
// pattern.drums[lane] = absolute step indexes (bar * stepsPerBar + step)
// pattern.melody = [{step, len, row}]: the vocal line, row = scale degree index (0 = low tonic), monophonic
// pattern.layers[instrumentId or "bass"] = [{step, len, midi}]: bass and extra instruments played on the stage
// pattern.chords[bar] = degree 0..6 of the parent scale, or -1
function newPattern(name, bars) {
  bars = bars || 1;
  return { id: uid(), name, bars, drums: Object.fromEntries(DRUMS.map(d => [d.id, []])), melody: [], layers: {}, chords: Array(bars).fill(-1), chordHits: [] };
}
function defaultDeck() {
  return [
    { id: "voice",   name: "Voice",   sound: "oohs",    controller: "keys",    role: "voice",  octave: 0,  color: "#f3a63b" },
    { id: "drums",   name: "Drums",   sound: "kit",     controller: "kit",     role: "drums",  octave: 0,  color: "#e2574c" },
    { id: "bass",    name: "Bass",    sound: "fbass",   controller: "strings", role: "bass",   octave: -2, color: "#3fa7d6" },
    { id: "chords",  name: "Chords",  sound: "epiano",  controller: "chords",  role: "chords", octave: 0,  color: "#9b6bde" },
    { id: "kalimba", name: "Kalimba", sound: "kalimba", controller: "grid",    role: "layer",  octave: 1,  color: "#5cc98a" },
  ];
}
function demoProject() {
  const a = newPattern("Groove A", 4), spb = 16;
  const bar = (b, steps) => steps.map(s => b * spb + s), all = steps => [].concat(...[0, 1, 2, 3].map(b => bar(b, steps)));
  a.drums.kick = all([0, 6, 10]); a.drums.clap = all([4, 12]); a.drums.hat = all([0, 2, 4, 6, 8, 10, 12]); a.drums.ohat = all([14]);
  a.drums.shaker = all([1, 3, 5, 7, 9, 11, 13, 15]); a.drums.tom = bar(3, [13, 15]);
  a.chords = [0, 5, 3, 4];
  a.melody = [
    { step: 0, row: 2, len: 2 }, { step: 2, row: 4, len: 2 }, { step: 4, row: 2, len: 4 }, { step: 10, row: 0, len: 4 },
    { step: 16, row: 2, len: 2 }, { step: 18, row: 4, len: 2 }, { step: 20, row: 5, len: 4 }, { step: 26, row: 4, len: 2 }, { step: 28, row: 2, len: 2 },
    { step: 32, row: 3, len: 2 }, { step: 34, row: 2, len: 2 }, { step: 36, row: 0, len: 4 }, { step: 42, row: 1, len: 4 },
    { step: 48, row: 1, len: 2 }, { step: 50, row: 2, len: 2 }, { step: 52, row: 3, len: 4 }, { step: 58, row: 2, len: 6 },
  ];
  a.layers.kalimba = [[0, 76], [3, 79], [6, 81], [8, 76], [11, 79], [14, 84], [16, 81], [19, 79], [22, 76], [24, 81], [27, 79], [30, 76],
    [32, 77], [35, 81], [38, 84], [40, 77], [43, 81], [46, 86], [48, 79], [51, 83], [54, 86], [56, 79], [59, 83], [62, 88]].map(([step, midi]) => ({ step, len: 2, midi }));
  const b = clone(a); b.id = uid(); b.name = "Groove B"; b.chords = [5, 3, 0, 4];
  b.drums.snare = all([4, 12]); b.drums.clap = all([12]); b.drums.rim = all([3, 7, 11]);
  b.melody = b.melody.map(n => ({ ...n, row: Math.min(14, n.row + 2) }));
  return { version: 2, name: "Demo groove", title: "Groove Box sketch", bpm: 104, swing: 20, meter: "4/4", grid: 16, key: "C", scale: "major",
           octave: 0, timbre: "keys", deck: defaultDeck(), patterns: [a, b],
           song: [{ pattern: a.id, repeat: 1, section: "intro" }, { pattern: a.id, repeat: 2, section: "verse" }, { pattern: b.id, repeat: 2, section: "chorus" }] };
}
function blankProject() {
  const a = newPattern("Loop 1", 2);
  return { ...demoProject(), name: "New groove", patterns: [a], song: [{ pattern: a.id, repeat: 2, section: "verse" }] };
}
function normalizeProject(p) {
  p = clone(p);
  if (!p.patterns || !p.patterns.length) p.patterns = [newPattern("Loop 1")];
  for (const q of p.patterns) {
    q.drums = q.drums || {}; for (const d of DRUMS) q.drums[d.id] = q.drums[d.id] || [];
    q.chords = Array.from({ length: q.bars }, (_, i) => (q.chords && q.chords[i] != null) ? q.chords[i] : -1);
    q.melody = q.melody || []; q.layers = q.layers || {}; q.chordHits = q.chordHits || [];
  }
  p.song = (p.song || []).filter(s => p.patterns.some(q => q.id === s.pattern));
  if (!p.song.length) p.song = [{ pattern: p.patterns[0].id, repeat: 1, section: "verse" }];
  if (!SCALES[p.scale]) p.scale = "major"; if (!KEYS.includes(p.key)) p.key = "C";
  p.grid = p.grid === 8 ? 8 : 16; p.meter = METERS.includes(p.meter) ? p.meter : "4/4";
  p.style = p.style || ""; p.lyrics = p.lyrics || ""; p.soundSet = p.soundSet === "full" ? "full" : "stage";
  p.bpm = clamp(+p.bpm || 100, 60, 180); p.swing = clamp(+p.swing || 0, 0, 60); p.octave = clamp(+p.octave || 0, -1, 1);
  p.feel = { ...DEFAULT_FEEL, ...(p.feel || {}) };
  if (!Array.isArray(p.deck) || !p.deck.length) p.deck = defaultDeck();
  p.deck = (p.deck || []).map(i => i.controller === "bubbles" ? { ...i, controller: "grid" } : i);
  // role: fixed for kits and sweeps; any melodic sound may play as voice, bass, chords or a layer
  p.deck = p.deck.filter(i => SOUND_BY_ID[i.sound] && CONTROLLERS.some(c => c.id === i.controller)).map(i => { const snd = SOUND_BY_ID[i.sound], role = snd.drumkit ? "drums" : snd.fx ? "fx" : ["voice", "bass", "chords", "layer"].includes(i.role) ? i.role : snd.role; return { octave: 0, color: "#888", ...i, role, arp: role === "chords" ? { ...DEFAULT_ARP, ...(i.arp || {}) } : undefined, feel: { ...DEFAULT_INST_FEEL, ...(i.feel || {}) } }; });
  for (const i of p.deck) if (!CONTROLLERS.find(c => c.id === i.controller).roles.includes(i.role)) i.controller = CONTROLLERS.find(c => c.roles.includes(i.role)).id;
  if (!p.deck.length) p.deck = defaultDeck();
  p.version = 2;
  return p;
}

// ---------- music helpers (bound to a project) ----------
const METERS = ["4/4", "3/4", "2/4", "6/8", "9/8", "12/8"];
function meterParts(m) { const mm = /^(\d+)\/(\d+)$/.exec(m || "4/4"); return mm ? [+mm[1], +mm[2]] : [4, 4]; }
function beats(P) { const [n, d] = meterParts(P.meter); return n * 4 / d; }        // quarter-note beats per bar
function spb(P) { const [n, d] = meterParts(P.meter); return Math.round(n / d * P.grid); }  // steps per bar
function scaleDef(P) { return SCALES[P.scale]; }
function nRows(P) { return scaleDef(P).steps.length * 2 + 1; }
function tonicPc(P) { return KEYS.indexOf(P.key); }
function midiOfRow(P, row) {
  const s = scaleDef(P).steps, n = s.length, pc = tonicPc(P);
  const base = (pc >= 7 ? 48 : 60) + pc + 12 * P.octave;
  return base + 12 * Math.floor(row / n) + s[((row % n) + n) % n];
}
function rowOfMidi(P, midi) {   // nearest scale row for a pitch (exact when the pitch is in the scale)
  const n = nRows(P); let best = 0, dist = 1e9;
  for (let r = 0; r < n; r++) { const d = Math.abs(midiOfRow(P, r) - midi); if (d < dist) { dist = d; best = r; } }
  return best;
}
function pitchClass(name) { return (NATURAL[LETTERS.indexOf(name[0])] + (name[1] === "#" ? 1 : name[1] === "b" ? -1 : 0) + 12) % 12; }
function relMajor(minorTonic) {
  const li = (LETTERS.indexOf(minorTonic[0]) + 2) % 7, pc = pitchClass(minorTonic);
  const alt = (((pc + 3) % 12 - NATURAL[li]) % 12 + 18) % 12 - 6;
  return LETTERS[li] + (alt === 1 ? "#" : alt === -1 ? "b" : "");
}
function keyInfo(P) {
  const minor = scaleDef(P).minor, pc = tonicPc(P), tonic = minor ? MINOR_KEYS[pc] : KEYS[pc];
  const f = FIFTHS[minor ? relMajor(tonic) : tonic] || 0, sig = {};
  for (let i = 0; i < Math.abs(f); i++) sig[(f > 0 ? SHARP_ORDER : FLAT_ORDER)[i]] = f > 0 ? 1 : -1;
  return { tonic, minor, field: tonic + (minor ? "m" : ""), sig, f };
}
function spell(midi, sig, f) {   // letter + alteration for a pitch, preferring the key's own spellings
  const pc = ((midi % 12) + 12) % 12; let best = null;
  for (let li = 0; li < 7; li++) {
    let alt = pc - NATURAL[li]; if (alt > 6) alt -= 12; if (alt < -6) alt += 12;
    if (Math.abs(alt) > 1) continue;
    const score = (sig[LETTERS[li]] || 0) === alt ? 0 : alt === 0 ? 1 : (f < 0 ? alt < 0 : alt > 0) ? 2 : 3;
    if (!best || score < best.score) best = { li, alt, score };
  }
  return { letter: LETTERS[best.li], alt: best.alt, octave: Math.floor((midi - best.alt) / 12) - 1 };
}
const NAMES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"], NAMES_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
function noteName(P, midi) { return (keyInfo(P).f < 0 ? NAMES_FLAT : NAMES_SHARP)[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1); }
function rowName(P, row) { return noteName(P, midiOfRow(P, row)); }
const SOLFEGE = ["do", "re", "mi", "fa", "so", "la", "ti"];
function parentSteps(P) { const d = scaleDef(P); return (d.parent ? SCALES[d.parent] : d).steps; }
function chordInfo(P, degree) {
  if (degree == null || degree < 0) return null;
  const ps = parentSteps(P), pc = tonicPc(P), k = keyInfo(P);
  const at = i => ps[i % 7] + 12 * Math.floor(i / 7);
  const root = at(degree), third = at(degree + 2) - root, fifth = at(degree + 4) - root;
  const quality = third === 4 && fifth === 7 ? "" : third === 3 && fifth === 7 ? "m" : third === 3 && fifth === 6 ? "dim" : third === 4 && fifth === 8 ? "aug" : "";
  const rootPc = (pc + root) % 12, sp = spell(60 + rootPc, k.sig, k.f);
  const rootName = sp.letter + (sp.alt === 1 ? "#" : sp.alt === -1 ? "b" : "");
  const numerals = ["I", "II", "III", "IV", "V", "VI", "VII"];
  const numeral = quality === "m" || quality === "dim" ? numerals[degree].toLowerCase() + (quality === "dim" ? "°" : "") : numerals[degree] + (quality === "aug" ? "+" : "");
  const r = 60 + rootPc - (rootPc > 6 ? 12 : 0);
  return { degree, symbol: rootName + quality, numeral, bassRoot: 36 + rootPc, bassFifth: 36 + ((rootPc + fifth) % 12), voicing: [r, r + third, r + fifth], rootPc };
}
// A bar's chord: the strike sounding at the bar line (or the first strike in the bar) wins over the bar's chord pad.
function barChord(P, p, bar) {
  const n = spb(P), hits = (p.chordHits || []).filter(h => h.step < (bar + 1) * n && h.step + h.len > bar * n).sort((a, b) => a.step - b.step);
  if (hits.length) return chordInfo(P, hits[0].degree);
  return chordInfo(P, p.chords[bar] != null ? p.chords[bar] : -1);
}
function hitsInBar(P, p, bar) { const n = spb(P); return (p.chordHits || []).filter(h => h.step >= bar * n && h.step < (bar + 1) * n).sort((a, b) => a.step - b.step); }
function addChordHit(P, p, abs, degree, len, off) {   // one chord at a time; a strike may hold across bar lines, up to the end of the loop
  const n = spb(P), end = Math.min(abs + len, p.bars * n);
  p.chordHits = (p.chordHits || []).filter(h => !(h.step < end && h.step + h.len > abs));
  if (degree >= 0) p.chordHits.push({ step: abs, len: end - abs, degree, off: off || 0 }); p.chordHits.sort((a, b) => a.step - b.step);
}
// Arpeggiator: how a chords instrument plays a strike. rhythm = 16 chars per bar on the 16th grid ("x" = onset), relative to the strike.
const DEFAULT_ARP = { mode: "block", rhythm: "x---------------", octaves: 1, gate: 0.9 };
const ARP_MODES = [["block", "Block"], ["up", "Up"], ["down", "Down"], ["updown", "Up & down"], ["random", "Random"], ["strum", "Strum"]];
const ARP_RHYTHMS = [
  ["x---------------", "Hold", "daaa"], ["x-x-x-x-x-x-x-x-", "Eighths", "da da da da da da da da"], ["xxxxxxxxxxxxxxxx", "Sixteenths", "dadadadadadadada"],
  ["x-x-----x---x-x-", "Call & answer", "da da … da, da da"], ["x-x-x---x-x-x-x-", "Three then four", "da da da … da da da da"], ["x--x--x-x--x--x-", "Tresillo", "da . . da . . da . da . . da . . da"],
  ["x--x-x--x--x-x--", "Amapiano", "da . . da . da . . da . . da . da"], ["--x---x---x---x-", "Offbeats", ". da . da . da . da"], ["x---x---x---x---", "Quarters", "da . da . da . da"],
  ["x-------x---x---", "Push", "da … da . da"], ["x--x--x---x--x--", "Clave", "da . . da . . da . . . da . . da"],
];
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function arpNotes(P, inst, hit) {   // -> [{step, len, midi}] (absolute steps) for one strike
  const c = chordInfo(P, hit.degree); if (!c) return [];
  const arp = { ...DEFAULT_ARP, ...((inst && inst.arp) || {}) }, grid = P.grid, per16 = grid / 16;   // rhythm is written in 16ths
  let tones = c.voicing.slice(); if (arp.octaves >= 2) tones = tones.concat(c.voicing.map(m => m + 12)); if (arp.octaves >= 3) tones = tones.concat(c.voicing.map(m => m + 24));
  tones = tones.map(m => m + 12 * ((inst && inst.octave) || 0));
  const onsets = []; for (let k = 0; k < hit.len; k++) { const r16 = Math.floor(k / per16); if (k % per16 === 0 && arp.rhythm[r16 % 16] === "x") onsets.push(k); }
  if (!onsets.length) onsets.push(0);
  const seq = arp.mode === "down" ? tones.slice().reverse() : arp.mode === "updown" ? tones.concat(tones.slice(1, -1).reverse()) : tones;
  const rnd = mulberry(hit.step * 31 + hit.degree * 7 + 1), out = [];
  onsets.forEach((k, i) => {
    const next = i + 1 < onsets.length ? onsets[i + 1] : hit.len, len = Math.max(1, Math.round((next - k) * arp.gate));
    if (arp.mode === "block" || arp.mode === "strum") { tones.forEach((m, j) => out.push({ step: hit.step + k, len, midi: m, strum: arp.mode === "strum" ? j : 0 })); }
    else if (arp.mode === "random") out.push({ step: hit.step + k, len, midi: tones[Math.floor(rnd() * tones.length)] });
    else out.push({ step: hit.step + k, len, midi: seq[i % seq.length] });
  });
  return out;
}
function chordLayer(P, p, inst) { const out = []; for (const h of (p.chordHits || [])) out.push(...arpNotes(P, inst, h)); return out.sort((a, b) => a.step - b.step || a.midi - b.midi); }
// The arpeggiated notes that start exactly at step `abs`, from every strike sounding there (a strike may have begun bars ago).
function chordEventsAt(P, p, inst, abs) {
  const out = [];
  for (const h of (p.chordHits || [])) { if (h.step > abs || abs >= h.step + h.len) continue; for (const x of arpNotes(P, inst, h)) if (x.step === abs) out.push({ ...x, hit: h }); }
  return out;
}
function chordSoundingAt(p, abs) { return (p.chordHits || []).some(h => h.step <= abs && abs < h.step + h.len); }
// Bass for a bar: what the player recorded on a bass instrument, else root on kicks and fifth on snares over the bar's chord.
function bassEvents(P, p, bar) {
  const n = spb(P), base = bar * n;
  const played = (p.layers && p.layers.bass || []).filter(x => x.step >= base && x.step < base + n).sort((a, b) => a.step - b.step);
  if (played.length) {
    const out = []; let cursor = 0;
    for (const x of played) { const s = x.step - base; if (s < cursor) continue; out.push({ step: s, midi: x.midi, len: Math.min(x.len, n - s), off: x.off || 0 }); cursor = s + out[out.length - 1].len; }
    return out;
  }
  const ch = barChord(P, p, bar) || chordInfo(P, 0);
  const kicks = new Set(p.drums.kick.filter(s => s >= base && s < base + n).map(s => s - base));
  const snares = new Set(p.drums.snare.filter(s => s >= base && s < base + n).map(s => s - base));
  const steps = [...new Set([...kicks, ...snares])].sort((a, b) => a - b);
  if (!steps.length) return barChord(P, p, bar) ? [{ step: 0, midi: ch.bassRoot, len: n }] : [];
  return steps.map((s, i) => ({ step: s, midi: kicks.has(s) ? ch.bassRoot : ch.bassFifth, len: (i + 1 < steps.length ? steps[i + 1] : n) - s }));
}

// ---------- generators: drum patterns and basslines that fit the loop ----------
// Each style: per lane, a 16-step weight row for 4/4 (12 steps for 3/4 and 6/8 styles). 1 = always, 0 = never, between = depends on density.
const DRUM_STYLES = {
  afrobeats:  { name: "Afrobeats", meter: "4/4", lanes: { kick: "9..3..9.3.9..3..", snare: "....9.......9...", rim: "..3...4...3..4..", hat: "8.6.8.6.8.6.8.6.", ohat: "..............5.", shaker: ".4.4.4.4.4.4.4.4", clap: "....5.......5...", lowtom: ".........3....4.", tom: "...............2" } },
  amapiano:   { name: "Amapiano", meter: "4/4", lanes: { kick: "9......9..9.....", lowtom: "...6..6...7.6..6", shaker: "8.8.8.8.8.8.8.8.", hat: ".3.3.3.3.3.3.3.3", rim: "....8.......8...", clap: "............4...", snare: "....3.......5..." } },
  highlife:   { name: "Highlife", meter: "4/4", lanes: { kick: "9...6...9...6...", rim: "..5..5.5..5..5.5", hat: "8.7.8.7.8.7.8.7.", shaker: ".5.5.5.5.5.5.5.5", snare: "....8.......8...", crash: "9..............." } },
  house:      { name: "House", meter: "4/4", lanes: { kick: "9...9...9...9...", clap: "....9.......9...", hat: "6.6.6.6.6.6.6.6.", ohat: "..9...9...9...9.", shaker: ".3.3.3.3.3.3.3.3", snare: "....3.......3..." } },
  hiphop:     { name: "Hip-hop", meter: "4/4", lanes: { kick: "9..3......9.4...", snare: "....9.......9...", hat: "8.6.8.6.8.6.8.6.", ohat: "..............5.", clap: "....4.......4...", rim: "......3.......2." } },
  trap:       { name: "Trap", meter: "4/4", lanes: { kick: "9.....3...9..3..", snare: "........9.......", hat: "888688886888688a", ohat: "...........5....", clap: "........5......." } },
  dembow:     { name: "Dembow", meter: "4/4", lanes: { kick: "9...9...9...9...", snare: "...9..9....9..9.", rim: ".3.....3.3.....3", hat: "6.6.6.6.6.6.6.6.", shaker: ".4.4.4.4.4.4.4.4", clap: "...5..5....5..5." } },
  funk:       { name: "Funk", meter: "4/4", lanes: { kick: "9.3...9..39.....", snare: "....9..3....9.3.", hat: "88788878887888a8", ohat: "..........5.....", rim: ".......2........" } },
  rock:       { name: "Rock", meter: "4/4", lanes: { kick: "9...3.9.9...3...", snare: "....9.......9...", hat: "8.8.8.8.8.8.8.8.", crash: "9...............", tom: "..............4.", lowtom: "...............4" } },
  bossa:      { name: "Bossa nova", meter: "4/4", lanes: { kick: "9..6....9..6....", rim: "x..x..x...x..x..".replace(/x/g, "8"), hat: "7.7.7.7.7.7.7.7.", shaker: "6.6.6.6.6.6.6.6." } },
  minimal:    { name: "Minimal", meter: "4/4", lanes: { kick: "9.......9.......", clap: "....7.......7...", hat: "..5...5...5...5.", shaker: "3.3.3.3.3.3.3.3." } },
  waltz:      { name: "Waltz", meter: "3/4", lanes: { kick: "9...........", snare: "....7...7...", hat: "6.6.6.6.6.6.", shaker: ".3.3.3.3.3.3" } },
  jig:        { name: "Jig", meter: "6/8", lanes: { kick: "9.....8.....", snare: "...6.....6..", hat: "8.7.7.8.7.7.", shaker: ".4.4.4.4.4.4", rim: "..3........3" } },
  slipjig:    { name: "Slip jig", meter: "9/8", lanes: { kick: "9.....7.....7.....", hat: "8.6.6.8.6.6.8.6.6.", shaker: ".4.4.4.4.4.4.4.4.4", rim: "...5.....5.....5.." } },
};
function drumStylesFor(meter) { return Object.entries(DRUM_STYLES).filter(([, st]) => st.meter === meter).map(([id, st]) => ({ id, name: st.name })); }
// density 0..1 (how many of the optional hits land), variation 0..1 (how much each bar differs), fill: tom/snare run in the last beats.
function generateDrums(P, p, styleId, opts) {
  opts = opts || {}; const st = DRUM_STYLES[styleId] || DRUM_STYLES.afrobeats, n = spb(P), density = opts.density == null ? 0.6 : opts.density, variation = opts.variation == null ? 0.3 : opts.variation;
  const rnd = mulberry((opts.seed || 1) * 2654435761), rowLen = Object.values(st.lanes)[0].length, scale = n / rowLen;
  const drums = Object.fromEntries(DRUMS.map(d => [d.id, []]));
  for (let bar = 0; bar < p.bars; bar++) {
    for (const [lane, row] of Object.entries(st.lanes)) {
      if (!drums[lane]) continue;
      for (let i = 0; i < rowLen; i++) {
        const ch = row[i]; if (ch === ".") continue;
        const w = (ch === "a" ? 10 : +ch) / 9, jitter = (rnd() - 0.5) * variation;
        if (w >= 0.95 ? rnd() > variation * 0.25 : (w + jitter) > (1 - density)) drums[lane].push(bar * n + Math.round(i * scale));
      }
      if (variation > 0.5 && rnd() < (variation - 0.5)) { const extra = Math.floor(rnd() * n); if (!drums[lane].includes(bar * n + extra)) drums[lane].push(bar * n + extra); }   // a surprise now and then
    }
  }
  if (opts.fill && p.bars > 0) {   // last two beats of the last bar: a tom/snare run
    const bar = p.bars - 1, beat = P.grid / 4, start = bar * n + n - 2 * beat, lanes = ["snare", "tom", "tom", "lowtom", "snare", "snare", "lowtom", "lowtom"];
    for (let k = 0; k < 2 * beat; k++) { if (rnd() < 0.8) drums[lanes[k % lanes.length]].push(start + k); }
    drums.crash = drums.crash.filter(s => Math.floor(s / n) !== bar); 
  }
  for (const d of DRUMS) drums[d.id] = [...new Set(drums[d.id])].sort((a, b) => a - b);
  return drums;
}
const BASS_STYLES = [
  ["kicks", "Roots on the kicks"], ["pulse", "Pulse (every eighth)"], ["bounce", "Octave bounce"], ["walk", "Walking"], ["dembow", "Dembow"], ["amapiano", "Amapiano log drum"], ["sustain", "Sustained root"], ["fifths", "Root & fifth"],
];
function generateBass(P, p, styleId, opts) {   // -> [{step, len, midi}] for layers.bass
  opts = opts || {}; const n = spb(P), beat = P.grid / 4, out = [], rnd = mulberry((opts.seed || 1) * 40503);
  const push = (bar, s, len, midi) => { if (s < n) out.push({ step: bar * n + s, len: Math.min(len, n - s), midi }); };
  for (let bar = 0; bar < p.bars; bar++) {
    const c = barChord(P, p, bar) || chordInfo(P, 0), r = c.bassRoot, f = c.bassFifth, third = r + (c.voicing[1] - c.voicing[0]);
    switch (styleId) {
      case "pulse": for (let s = 0; s < n; s += beat / 2) push(bar, s, beat / 2, r); break;
      case "bounce": for (let s = 0, i = 0; s < n; s += beat / 2, i++) push(bar, s, beat / 2, i % 2 ? r + 12 : r); break;
      case "walk": { const seq = [r, third, f, rnd() < 0.5 ? f + 2 : r + 12]; for (let s = 0, i = 0; s < n; s += beat, i++) push(bar, s, beat, seq[i % seq.length]); break; }
      case "dembow": { const pat = [[0, 3], [3, 3], [6, 2], [8, 3], [11, 3], [14, 2]]; pat.forEach(([s, l], i) => push(bar, Math.round(s * n / 16), Math.round(l * n / 16), i % 3 === 2 ? f : r)); break; }
      case "amapiano": { const pat = [[0, 2, r], [3, 2, r], [5, 2, f], [8, 2, r], [11, 2, r], [13, 2, f + 12 > 59 ? f : f], [15, 1, r + 12]]; pat.forEach(([s, l, m]) => push(bar, Math.round(s * n / 16), Math.max(1, Math.round(l * n / 16)), m)); break; }
      case "sustain": push(bar, 0, n, r); break;
      case "fifths": for (let s = 0, i = 0; s < n; s += beat, i++) push(bar, s, beat, i % 2 ? f : r); break;
      default: { const kicks = [...new Set(p.drums.kick.filter(s => s >= bar * n && s < (bar + 1) * n).map(s => s - bar * n))].sort((a, b) => a - b); if (!kicks.length) kicks.push(0); kicks.forEach((s, i) => push(bar, s, (i + 1 < kicks.length ? kicks[i + 1] : n) - s, r)); }
    }
  }
  return out;
}

// ---------- feel: swing, groove templates, humanising, quantise (playback only; the score stays on the grid) ----------
// Groove templates: per 16th position in a bar, a timing offset (fraction of a 16th; + is late) and an accent (0..1).
const GROOVES = {
  straight: { name: "Straight", off: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], acc: [1, .6, .75, .6, .9, .6, .75, .6, .95, .6, .75, .6, .9, .6, .75, .65] },
  dilla:    { name: "Dilla drag", off: [0, .22, -.1, .3, .05, .2, -.06, .28, 0, .24, -.08, .3, .06, .2, -.05, .26], acc: [1, .5, .8, .55, .9, .5, .7, .6, .95, .5, .8, .55, .9, .5, .75, .7] },
  amapiano: { name: "Amapiano shuffle", off: [0, -.05, .12, .22, 0, -.05, .12, .22, 0, -.05, .12, .22, 0, -.05, .12, .22], acc: [1, .55, .7, .8, .85, .55, .7, .8, .95, .55, .7, .8, .85, .55, .7, .85] },
  afro:     { name: "Afro push", off: [0, .05, -.1, .1, 0, .05, -.1, .1, 0, .05, -.1, .1, 0, .05, -.1, .1], acc: [1, .6, .85, .6, .8, .6, .9, .6, .95, .6, .85, .6, .8, .6, .9, .7] },
  laidback: { name: "Laid back", off: [0, .15, .15, .15, .12, .15, .15, .15, .08, .15, .15, .15, .12, .15, .15, .15], acc: [1, .55, .7, .55, .85, .55, .7, .55, .9, .55, .7, .55, .85, .55, .7, .6] },
  push:     { name: "Pushing", off: [0, -.12, -.12, -.12, -.1, -.12, -.12, -.12, -.08, -.12, -.12, -.12, -.1, -.12, -.12, -.12], acc: [1, .65, .8, .65, .9, .65, .8, .65, .95, .65, .8, .65, .9, .65, .8, .7] },
  halftime: { name: "Half-time drag", off: [0, .05, .05, .05, .05, .05, .05, .05, .1, .18, .18, .18, .18, .18, .18, .2], acc: [1, .5, .7, .5, .8, .5, .7, .5, .95, .5, .7, .5, .8, .5, .7, .6] },
};
const DEFAULT_FEEL = { groove: "straight", amount: 100, humanTime: 0, humanVel: 0 };            // song-wide
const DEFAULT_INST_FEEL = { follow: true, quantize: 1, swing: null, groove: null, amount: null, humanTime: null, humanVel: null };   // per instrument; null = follow the song
function feelOf(P, inst) {   // the effective feel for an instrument
  const song = { swing: P.swing, ...DEFAULT_FEEL, ...(P.feel || {}) }, f = { ...DEFAULT_INST_FEEL, ...((inst && inst.feel) || {}) };
  if (f.follow) return { ...song, quantize: f.quantize };
  return { quantize: f.quantize, swing: f.swing == null ? song.swing : f.swing, groove: f.groove || song.groove, amount: f.amount == null ? song.amount : f.amount, humanTime: f.humanTime == null ? song.humanTime : f.humanTime, humanVel: f.humanVel == null ? song.humanVel : f.humanVel };
}
// Timing offset (seconds) and velocity multiplier for an event at step `sIn` of the bar, with optional recorded micro-offset `off` (fraction of a step).
function feelEvent(P, feel, sIn, sd, off) {
  const per16 = P.grid / 16, pos16 = Math.floor(sIn / per16) % 16, g = GROOVES[feel.groove] || GROOVES.straight, amt = (feel.amount == null ? 100 : feel.amount) / 100;
  let t = (off || 0) * sd;
  if (sIn % 2 === 1) t += (feel.swing || 0) / 100 * sd * 0.5;                        // swing: every second step late
  if (sIn % per16 === 0) t += g.off[pos16] * amt * (sd * per16);                     // groove micro-timing (in 16ths)
  let vel = 1 - (1 - g.acc[pos16]) * amt * 0.6;                                      // groove accents, softened
  if (feel.humanTime) t += (Math.random() - 0.5) * 2 * (feel.humanTime / 100) * sd * 0.3;
  if (feel.humanVel) vel *= 1 - (Math.random() * (feel.humanVel / 100) * 0.4);
  return { dt: t, vel: Math.max(0.15, Math.min(1.1, vel)) };
}
function snapInstrument(P, p, inst, q) {   // re-quantise an instrument's content to q steps and drop micro-offsets
  const n = spb(P), snap = s => { const b = Math.floor(s / n), r = Math.round((s - b * n) / q) * q; return b * n + Math.min(r, n - 1); };
  switch (inst.role) {
    case "drums": for (const d of DRUMS) p.drums[d.id] = [...new Set(p.drums[d.id].map(snap))].sort((a, b) => a - b); break;
    case "voice": { const seen = new Set(); p.melody = p.melody.map(x => ({ ...x, step: snap(x.step), off: 0 })).filter(x => { if (seen.has(x.step)) return false; seen.add(x.step); return true; }); break; }
    case "chords": p.chordHits = (p.chordHits || []).map(x => ({ ...x, step: snap(x.step), off: 0 })); break;
    default: { const k = inst.role === "bass" ? "bass" : inst.id; if (p.layers[k]) p.layers[k] = p.layers[k].map(x => ({ ...x, step: snap(x.step), off: 0 })); }
  }
}

// ---------- editing ----------
function toggleDrum(p, lane, abs, force) {
  const arr = p.drums[lane], i = arr.indexOf(abs), on = force === undefined ? i < 0 : force;
  if (on && i < 0) arr.push(abs); if (!on && i >= 0) arr.splice(i, 1);
  arr.sort((a, b) => a - b); return on;
}
function addDrumHit(p, lane, abs) { if (!p.drums[lane].includes(abs)) { p.drums[lane].push(abs); p.drums[lane].sort((a, b) => a - b); return true; } return false; }
function addMelodyNote(P, p, abs, row, len, off) {   // monophonic: replaces anything it overlaps
  const n = spb(P), end = Math.min(abs + len, (Math.floor(abs / n) + 1) * n);
  p.melody = p.melody.filter(x => !(x.step < end && x.step + x.len > abs));
  p.melody.push({ step: abs, row, len: end - abs, off: off || 0 }); p.melody.sort((a, b) => a.step - b.step);
}
function noteAt(p, abs) { return p.melody.find(x => x.step <= abs && abs < x.step + x.len); }
function addLayerNote(P, p, layer, abs, midi, len, mono, off) {
  const n = spb(P), end = Math.min(abs + len, (Math.floor(abs / n) + 1) * n);
  const arr = p.layers[layer] = p.layers[layer] || [];
  if (mono) p.layers[layer] = p.layers[layer].filter(x => !(x.step < end && x.step + x.len > abs));
  else p.layers[layer] = p.layers[layer].filter(x => !(x.step === abs && x.midi === midi));
  p.layers[layer].push({ step: abs, midi, len: end - abs, off: off || 0 }); p.layers[layer].sort((a, b) => a.step - b.step || a.midi - b.midi);
  return arr;
}
function setBars(P, p, bars) {
  const n = spb(P), max = bars * n;
  p.bars = bars; for (const d of DRUMS) p.drums[d.id] = p.drums[d.id].filter(s => s < max);
  p.melody = p.melody.filter(x => x.step < max); p.chordHits = (p.chordHits || []).filter(x => x.step < max);
  for (const k of Object.keys(p.layers)) p.layers[k] = p.layers[k].filter(x => x.step < max);
  p.chords = Array.from({ length: bars }, (_, i) => p.chords[i] != null ? p.chords[i] : -1);
}
function remapSteps(P, oldSpb, newSpb, ratio) {   // keep the groove's shape across grid/meter changes
  for (const p of P.patterns) {
    const map = s => { const b = Math.floor(s / oldSpb), w = Math.round((s % oldSpb) * ratio); return w < newSpb ? b * newSpb + w : -1; };
    for (const d of DRUMS) p.drums[d.id] = [...new Set(p.drums[d.id].map(map).filter(s => s >= 0))].sort((a, b) => a - b);
    const fix = (list, whole) => { const out = []; for (const x of list) { const s = map(x.step); if (s < 0) continue; out.push({ ...x, step: s, len: clamp(Math.round(x.len * ratio), 1, whole ? p.bars * newSpb - s : newSpb - s % newSpb) }); } return out; };
    const notes = fix(p.melody);
    p.melody = notes.filter((x, i) => !notes.some((y, j) => j < i && y.step < x.step + x.len && y.step + y.len > x.step));
    p.chordHits = fix(p.chordHits || [], true);
    for (const k of Object.keys(p.layers)) p.layers[k] = fix(p.layers[k]);
  }
}
function clearBar(P, p, bar, what) {
  const n = spb(P), a = bar * n, keep = x => x.step < a || x.step >= a + n;
  if (what === "drums" || what === "all") for (const d of DRUMS) p.drums[d.id] = p.drums[d.id].filter(s => s < a || s >= a + n);
  if (what === "melody" || what === "all") p.melody = p.melody.filter(keep);
  if (what === "layers" || what === "all") for (const k of Object.keys(p.layers)) p.layers[k] = p.layers[k].filter(keep);
  if (what && what.startsWith("layer:")) { const k = what.slice(6); if (p.layers[k]) p.layers[k] = p.layers[k].filter(keep); }
  if (what === "chords" || what === "all") { p.chords[bar] = -1; p.chordHits = (p.chordHits || []).filter(keep); }
}
function copyBarNext(P, p, bar) {
  const n = spb(P); if (bar + 1 >= p.bars) return false;
  const a = bar * n, b = (bar + 1) * n, shift = list => list.filter(x => x.step < b || x.step >= b + n).concat(list.filter(x => x.step >= a && x.step < b).map(x => ({ ...x, step: x.step + n }))).sort((x, y) => x.step - y.step);
  for (const d of DRUMS) p.drums[d.id] = [...new Set(p.drums[d.id].filter(s => s < b || s >= b + n).concat(p.drums[d.id].filter(s => s >= a && s < b).map(s => s + n)))].sort((x, y) => x - y);
  p.melody = shift(p.melody); p.chordHits = shift(p.chordHits || []); for (const k of Object.keys(p.layers)) p.layers[k] = shift(p.layers[k]);
  p.chords[bar + 1] = p.chords[bar]; return true;
}

// ---------- per-instrument content (for the arrangement views) ----------
function instEvents(P, p, inst, bar) {   // events of an instrument in a pattern (optionally one bar): [{step, len?}]
  const n = spb(P), inBar = x => bar == null || (x.step >= bar * n && x.step < (bar + 1) * n);
  switch (inst.role) {
    case "voice": return p.melody.filter(inBar);
    case "drums": { const out = []; for (const d of DRUMS) for (const s of p.drums[d.id]) if (bar == null || (s >= bar * n && s < (bar + 1) * n)) out.push({ step: s, len: 1 }); return out; }
    case "bass": return (p.layers.bass || []).filter(inBar);
    case "chords": { if ((p.chordHits || []).length) return p.chordHits.filter(inBar); const out = []; p.chords.forEach((c, b) => { if (c >= 0 && (bar == null || b === bar)) out.push({ step: b * n, len: n }); }); return out; }
    default: return (p.layers[inst.id] || []).filter(inBar);
  }
}
function density(P, p, inst, bar) {   // 0..1: how busy an instrument is, per bar
  const n = spb(P), bars = bar == null ? p.bars : 1, ev = instEvents(P, p, inst, bar);
  const cap = inst.role === "drums" ? n * 1.5 : inst.role === "chords" ? 1 : n / 2;
  return Math.min(1, ev.length / (cap * bars));
}
function clearInstrument(P, p, inst, bar) {   // remove an instrument's content from a pattern (or one bar of it)
  const n = spb(P), keep = x => bar != null && (x.step < bar * n || x.step >= (bar + 1) * n);
  switch (inst.role) {
    case "voice": p.melody = p.melody.filter(keep); break;
    case "drums": for (const d of DRUMS) p.drums[d.id] = p.drums[d.id].filter(s => bar != null && (s < bar * n || s >= (bar + 1) * n)); break;
    case "bass": if (p.layers.bass) p.layers.bass = p.layers.bass.filter(keep); break;
    case "chords": if (bar == null) { p.chords = p.chords.map(() => -1); p.chordHits = []; } else { p.chords[bar] = -1; p.chordHits = (p.chordHits || []).filter(keep); } break;
    default: if (p.layers[inst.id]) p.layers[inst.id] = p.layers[inst.id].filter(keep);
  }
}

// ---------- ABC export ----------
const MULTS = [48, 32, 24, 16, 12, 8, 6, 4, 3, 2, 1];
function rests(n) { let s = ""; for (const m of MULTS) while (n >= m) { s += "z" + (m === 1 ? "" : m); n -= m; } return s; }
const dur = n => n === 1 ? "" : String(n);
function abcPitch(midi, barState, k) {
  const sp = spell(midi, k.sig, k.f), L = sp.letter, active = L in barState ? barState[L] : (k.sig[L] || 0);
  let acc = ""; if (sp.alt !== active) { acc = ACC_TEXT[sp.alt]; barState[L] = sp.alt; }
  return acc + (sp.octave >= 5 ? L.toLowerCase() + "'".repeat(sp.octave - 5) : L + ",".repeat(4 - sp.octave));
}
function eventsBar(P, events, n, k, prefix, symbols) {   // monophonic [{step, midi, len}] (step relative to bar) -> bar text; symbols: {relStep: '"C"'}
  symbols = symbols || (prefix ? { 0: prefix } : {});
  const symAt = s => symbols[s] || "";
  const restRun = (from, to) => { let out = ""; const cuts = Object.keys(symbols).map(Number).filter(s => s > from && s < to).sort((a, b) => a - b); let c = from; for (const s of cuts) { out += rests(s - c) + symAt(s); c = s; } return out + rests(to - c); };
  if (!events.length) return Object.keys(symbols).length ? symAt(0) + restRun(0, n) : "Z";
  const st = {}; let out = "", cursor = 0;
  for (const e of events) {
    if (e.step < cursor) continue; const len = Math.min(e.len, n - e.step);
    if (e.step > cursor) out += symAt(cursor) + restRun(cursor, e.step);
    let sym = symAt(e.step); if (!sym) { for (let s = e.step + 1; s < e.step + len; s++) if (symbols[s]) { sym = symbols[s]; break; } }   // a strike inside a held note rides its start
    out += sym + abcPitch(e.midi, st, k) + dur(len); cursor = e.step + len;
  }
  if (cursor < n) out += symAt(cursor) + restRun(cursor, n);
  return out;
}
function vocalBar(P, p, bar, withChords, k) {
  const n = spb(P), base = bar * n;
  const ev = p.melody.filter(x => x.step >= base && x.step < base + n).sort((a, b) => a.step - b.step).map(x => ({ step: x.step - base, midi: midiOfRow(P, x.row), len: x.len }));
  let symbols = null;
  if (withChords) {
    const hits = hitsInBar(P, p, bar), sounding = (p.chordHits || []).some(h => h.step < base && h.step + h.len > base);
    if (hits.length || sounding) {
      symbols = {}; for (const h of hits) { const c = chordInfo(P, h.degree); if (c) symbols[h.step - base] = `"${c.symbol}"`; }
      if (!symbols[0]) { const ch = barChord(P, p, bar); if (ch) symbols[0] = `"${ch.symbol}"`; }   // a chord held over the bar line is restated
    } else { const ch = barChord(P, p, bar); if (ch) symbols = { 0: `"${ch.symbol}"` }; }
  }
  return eventsBar(P, ev, n, k, "", symbols || {});
}
function insBar(P, p, bar, k) { return eventsBar(P, bassEvents(P, p, bar), spb(P), k, ""); }
function layerBar(P, p, layer, bar, k) { return polyBar(P, p.layers[layer] || [], bar, k); }
function polyBar(P, events, bar, k) {   // polyphonic events -> chords in brackets, duration until the next onset
  const n = spb(P), base = bar * n, byStep = new Map();
  for (const x of events) if (x.step >= base && x.step < base + n) { const s = x.step - base; if (!byStep.has(s)) byStep.set(s, []); byStep.get(s).push(x); }
  const steps = [...byStep.keys()].sort((a, b) => a - b);
  if (!steps.length) return "Z";
  const st = {}; let out = "", cursor = 0;
  steps.forEach((s, i) => {
    if (s > cursor) out += rests(s - cursor);
    const notes = byStep.get(s), len = Math.min((i + 1 < steps.length ? steps[i + 1] : n) - s, Math.max(...notes.map(x => x.len)));
    const pitches = [...new Set(notes.map(x => x.midi))].sort((a, b) => a - b).map(m => abcPitch(m, st, k));
    out += (pitches.length > 1 ? `[${pitches.join("")}]` : pitches[0]) + dur(len); cursor = s + len;
    const gap = (i + 1 < steps.length ? steps[i + 1] : n) - cursor; if (gap > 0) { out += rests(gap); cursor += gap; }
  });
  return out;
}
function drumBar(P, p, bar) {
  const n = spb(P), base = bar * n, hits = new Map();
  for (const d of DRUMS) for (const s of p.drums[d.id]) if (s >= base && s < base + n) hits.set(s - base, (hits.get(s - base) || "") + d.perc);
  const steps = [...hits.keys()].sort((a, b) => a - b);
  if (!steps.length) return rests(n);
  let out = "", cursor = 0;
  steps.forEach((s, i) => { if (s > cursor) out += rests(s - cursor); const len = (i + 1 < steps.length ? steps[i + 1] : n) - s, h = hits.get(s); out += (h.length > 1 ? `[${h}]` : h) + dur(len); cursor = s + len; });
  return out;
}
function header(P, k) { return ["X:1", `T:${(P.title || "Groove Box sketch").replace(/\n/g, " ")}`, `M:${P.meter}`, `L:1/${P.grid}`, `Q:1/4=${P.bpm}`, `K:${k.field}`]; }
function byId(P, id) { return P.patterns.find(p => p.id === id) || P.patterns[0]; }
function sectionBars(P, part) { const p = byId(P, part.pattern), out = []; for (let r = 0; r < part.repeat; r++) for (let b = 0; b < p.bars; b++) out.push([p, b]); return out; }
function lines(bars) { const out = []; for (let i = 0; i < bars.length; i += 4) out.push(bars.slice(i, i + 4).join(" | ") + " |"); return out; }
function songParts(P) { return P.song.length ? P.song : [{ pattern: P.patterns[0].id, repeat: 1, section: "verse" }]; }
function exportYuE2(P, withChords) {
  const k = keyInfo(P), out = header(P, k);
  for (const part of songParts(P)) {
    const bars = sectionBars(P, part);
    out.push(`% ${part.section}`);
    out.push("V: Vocal", ...lines(bars.map(([p, b]) => vocalBar(P, p, b, withChords, k))));
    out.push("V: Ins", ...lines(bars.map(([p, b]) => insBar(P, p, b, k))));
  }
  return out.join("\n") + "\n";
}
function layerIds(P) {   // extra layers that actually hold notes, in deck order (sweeps and hits have no notation)
  const fx = new Set(P.deck.filter(i => i.role === "fx").map(i => i.id));
  const ids = new Set(); for (const p of P.patterns) for (const k of Object.keys(p.layers)) if (k !== "bass" && !fx.has(k) && p.layers[k].length) ids.add(k);
  return [...ids].sort((a, b) => P.deck.findIndex(i => i.id === a) - P.deck.findIndex(i => i.id === b));
}
function exportStandard(P) {
  const k = keyInfo(P), out = header(P, k), layers = layerIds(P);
  out.splice(out.length - 1, 0, ...DRUMS.map(d => `%%percmap ${d.perc} ${d.gm}${d.head ? " " + d.head : ""}`));
  const chordInst = P.deck.find(i => i.role === "chords") || null, hasHits = P.patterns.some(p => (p.chordHits || []).length);
  const voices = layers.map(id => ({ name: (P.deck.find(x => x.id === id) || { name: id }).name, events: p => p.layers[id] || [] }));
  if (hasHits) voices.unshift({ name: chordInst ? chordInst.name : "Chords", events: p => chordLayer(P, p, chordInst) });
  out.push(`V:1 clef=treble name="Melody"`, `V:2 clef=bass name="Bass"`);
  voices.forEach((v, i) => out.push(`V:${i + 3} clef=treble name="${v.name.replace(/"/g, "")}"`));
  out.push(`V:${voices.length + 3} clef=perc name="Drums"`);
  for (const part of songParts(P)) {
    const bars = sectionBars(P, part);
    out.push(`% ${part.section}`);
    out.push("[V:1]", ...lines(bars.map(([p, b]) => vocalBar(P, p, b, true, k))));
    out.push("[V:2]", ...lines(bars.map(([p, b]) => insBar(P, p, b, k))));
    voices.forEach((v, i) => out.push(`[V:${i + 3}]`, ...lines(bars.map(([p, b]) => polyBar(P, v.events(p), b, k)))));
    out.push(`[V:${voices.length + 3}]`, "%%MIDI channel 10", ...lines(bars.map(([p, b]) => drumBar(P, p, b))));
  }
  return out.join("\n") + "\n";
}
function exportAbc(P, flavour) { return flavour === "standard" ? exportStandard(P) : exportYuE2(P, flavour !== "yue2melody"); }
function scorePackage(P, abc) {
  return { format: "yue2-score", version: 1, abc: abc || exportYuE2(P, true), style: (P.style || "").trim(), lyrics: (P.lyrics || "").trim(), seed: 0, max_duration: 240, edited_with: "yue2-groove-box" };
}
// Bar-length check in the Score Studio's terms (same tokenizer as docs/index.html, plus bracket chords).
const TOKEN = /"[^"]*"|\[[A-Za-z]:[^\]]*\]|\[[^\]]+\]\d*|[_^=]*[A-Ga-g][',]*\d*-?|z\d*|Z\d*|\s+|./g;
function checkAbc(P, abc) {
  const want = spb(P), issues = [], bars = {}; let voice = null, section = 0;
  for (const line of abc.split("\n")) {
    if (/^%\s*\S/.test(line) && !/^%%/.test(line)) { section++; voice = null; continue; }
    const v = /^\[?V:\s*(\S+?)\]?\s*$/.exec(line); if (v) { voice = v[1]; continue; }
    if (!voice || /^[A-Za-z]:/.test(line) || /^%%/.test(line) || !line.trim()) continue;
    for (const bar of line.split("|")) {
      const t = bar.trim(); if (!t) continue;
      bars[voice] = (bars[voice] || 0) + (/^Z(\d*)$/.test(t) ? (+t.slice(1) || 1) : 1);
      if (/^Z\d*$/.test(t)) continue;
      let units = 0;
      for (const tok of t.match(TOKEN) || []) {
        if (/^\s+$/.test(tok) || tok.startsWith('"')) continue;
        const m = /(\d+)-?$/.exec(tok);
        if (/^[\[_^=]*[A-Ga-g]/.test(tok) || /^z/.test(tok)) units += m ? +m[1] : 1;
        else issues.push(`Unsupported symbol "${tok}" in section ${section}.`);
      }
      if (units !== want) issues.push(`Bar with ${units} units (expected ${want}) in section ${section}, ${voice}: “${t.slice(0, 32)}”`);
    }
  }
  const counts = Object.values(bars);
  if (counts.length > 1 && counts.some(c => c !== counts[0])) issues.push("Voices have different bar counts.");
  return { issues, bars: counts[0] || 0 };
}

// ---------- M3DS score PNG (same container as the Score Studio / m3ds.py; needs pako) ----------
const HEADER_SIZE = 40, FLAG_GZIP = 1;
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(bytes) { let c = 0xFFFFFFFF; for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function encodeM3DS(data, fname, minSide) {
  minSide = minSide || 256;
  const blob = window.pako.gzip(data, { level: 9 }), fb = new TextEncoder().encode(fname);
  const raw0 = new Uint8Array(HEADER_SIZE + fb.length + blob.length), dv = new DataView(raw0.buffer);
  raw0.set([77, 51, 68, 83], 0); dv.setUint8(4, 1); dv.setUint8(5, FLAG_GZIP); dv.setUint16(6, 0); dv.setUint16(8, 1);
  dv.setBigUint64(10, BigInt(blob.length)); dv.setUint32(18, blob.length); dv.setUint32(22, crc32(blob));
  dv.setBigUint64(26, BigInt(data.length)); dv.setUint32(34, crc32(data)); dv.setUint16(38, fb.length);
  raw0.set(fb, HEADER_SIZE); raw0.set(blob, HEADER_SIZE + fb.length);
  const pixels = Math.ceil(raw0.length / 3), w = Math.max(minSide, Math.ceil(Math.sqrt(pixels))), h = Math.max(minSide, Math.ceil(pixels / w));
  const rgb = new Uint8Array(w * h * 3); rgb.set(raw0);
  return writePngRGB(rgb, w, h);
}
function writePngRGB(rgb, w, h) {
  const rowLen = w * 3, filtered = new Uint8Array((rowLen + 1) * h);
  for (let y = 0; y < h; y++) { filtered[y * (rowLen + 1)] = 0; filtered.set(rgb.subarray(y * rowLen, (y + 1) * rowLen), y * (rowLen + 1) + 1); }
  const chunk = (type, body) => { const out = new Uint8Array(12 + body.length), dv = new DataView(out.buffer); dv.setUint32(0, body.length); out.set(new TextEncoder().encode(type), 4); out.set(body, 8); dv.setUint32(8 + body.length, crc32(out.subarray(4, 8 + body.length))); return out; };
  const ihdr = new Uint8Array(13), idv = new DataView(ihdr.buffer); idv.setUint32(0, w); idv.setUint32(4, h); ihdr.set([8, 2, 0, 0, 0], 8);
  return new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", window.pako.deflate(filtered, { level: 9 })), chunk("IEND", new Uint8Array(0))], { type: "image/png" });
}

// ---------- storage (shared between the stage and the editor) ----------
const AUTOSAVE = "yue2-groovebox:autosave", LIB = "yue2-groovebox:library", HANDOFF = "yue2-handoff";
function loadAutosave() { try { const p = JSON.parse(localStorage.getItem(AUTOSAVE) || "null"); return p && p.patterns ? normalizeProject(p) : null; } catch (e) { return null; } }
function saveAutosave(P) { try { localStorage.setItem(AUTOSAVE, JSON.stringify(P)); return true; } catch (e) { return false; } }
function library() { try { return JSON.parse(localStorage.getItem(LIB) || "[]"); } catch (e) { return []; } }
function setLibrary(items) { try { localStorage.setItem(LIB, JSON.stringify(items)); return true; } catch (e) { return false; } }
function saveToLibrary(P, name) { const items = library().filter(x => x.name !== name); items.unshift({ id: uid(), name, saved: Date.now(), project: clone(P) }); return setLibrary(items.slice(0, 50)); }
const safeName = s => (s || "groove").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "groove";
function download(blob, name) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }

// ---------- sequencer (shared; plays through a synth with note(ch, midi, t, dur, vel) / drum(gm, t, vel) / channelFor(inst)) ----------
function Sequencer(opts) {   // opts: project(), currentPattern(), synth(), onStep(sIn, entry, p), options()
  const S = { playing: false, mode: "loop", pos: 0, nextTime: 0, anchorTime: 0, timer: null, seq: [], total: 0, uiTimers: [], range: null };
  const P = () => opts.project(), synth = () => opts.synth(), now = () => synth().now();
  const stepDur = () => 60 / P().bpm / (P().grid / 4);
  function buildSeq() {
    const out = [], cur = opts.currentPattern();
    if (S.mode === "loop") { for (let b = 0; b < cur.bars; b++) out.push({ pid: cur.id, bar: b, part: -1 }); }
    else P().song.forEach((part, pi) => { if (S.range && (pi < S.range[0] || pi > S.range[1])) return; const p = byId(P(), part.pattern); for (let r = 0; r < part.repeat; r++) for (let b = 0; b < p.bars; b++) out.push({ pid: p.id, bar: b, part: pi }); });
    return out.length ? out : [{ pid: cur.id, bar: 0, part: -1 }];
  }
  function start() {
    if (!synth().ensure()) return false;
    stop(true);
    S.seq = buildSeq(); S.total = S.seq.length * spb(P()); S.pos = 0;
    S.nextTime = now() + 0.1; S.anchorTime = S.nextTime; S.playing = true;
    S.timer = setInterval(tick, 25); tick(); return true;
  }
  function stop(silent) {
    clearInterval(S.timer); S.timer = null; S.playing = false;
    S.uiTimers.forEach(clearTimeout); S.uiTimers = [];
    if (synth().allOff) synth().allOff();
    if (!silent && opts.onStep) opts.onStep(-1);
  }
  function tick() {
    const Pj = P(), ahead = now() + 0.16, sd = stepDur(), n = spb(Pj), o = opts.options ? opts.options() : {};
    while (S.nextTime < ahead) {
      const pos = S.pos, entry = S.seq[Math.floor(pos / n)], sIn = pos % n, p = byId(Pj, entry.pid), abs = entry.bar * n + sIn;
      const t0 = S.nextTime, sy = synth(), byRole = role => Pj.deck.find(i => i.role === role) || null, byIdI = id => Pj.deck.find(i => i.id === id) || null;
      const when = (inst, off) => { const f = feelEvent(Pj, feelOf(Pj, inst), sIn, sd, off); return { t: t0 + f.dt, vel: f.vel }; };
      { const di = byRole("drums"); for (const d of DRUMS) if (p.drums[d.id].includes(abs)) { const w = when(di, 0); sy.drum(d.gm, w.t, w.vel); } }
      { const vi = byRole("voice"); for (const note of p.melody) if (note.step === abs) { const w = when(vi, note.off); sy.note(sy.channelFor("voice"), midiOfRow(Pj, note.row), w.t, note.len * sd * 0.95, 0.9 * w.vel); } }
      for (const id of Object.keys(p.layers)) { if (id === "bass") continue; const li = byIdI(id); for (const x of p.layers[id]) if (x.step === abs) { const w = when(li, x.off); sy.note(sy.channelFor(id), x.midi, w.t, x.len * sd * 0.95, 0.85 * w.vel); } }
      if (o.hearBass !== false) { const bi = byRole("bass"); for (const e of bassEvents(Pj, p, entry.bar)) if (e.step === sIn) { const w = when(bi, e.off); sy.note(sy.channelFor("bass"), e.midi, w.t, e.len * sd * 0.9, 0.95 * w.vel); } }
      if (o.hearChords !== false) {
        const chordInst = byRole("chords");
        for (const x of chordEventsAt(Pj, p, chordInst, abs)) { const w = when(chordInst, x.step === x.hit.step ? x.hit.off : 0); sy.note(sy.channelFor("chords"), x.midi, w.t + (x.strum || 0) * 0.025, x.len * sd * 0.95, 0.7 * w.vel); }
        if (sIn === 0 && !chordSoundingAt(p, abs) && !hitsInBar(Pj, p, entry.bar).length) { const c = barChord(Pj, p, entry.bar); if (c) { const w = when(chordInst, 0); sy.chord(sy.channelFor("chords"), c.voicing, w.t, n * sd * 0.98, 0.55 * w.vel); } }
      }
      if (opts.onStep) { const delay = Math.max(0, (S.nextTime - now()) * 1000); S.uiTimers.push(setTimeout(() => { S.uiTimers.shift(); opts.onStep(sIn, entry, p); }, delay)); }
      S.nextTime += sd; S.pos = (S.pos + 1) % S.total;
      if (S.pos === 0) { S.anchorTime = S.nextTime; const seq = buildSeq(); S.seq = seq; S.total = seq.length * n; }
    }
  }
  function quantizedHit(q) {   // where "now" lands in the playing sequence -> {p, abs, sIn, entry, off}; q = steps to snap to (0 = keep the micro-offset)
    const n = spb(P()), sd = stepDur(), exact = (now() - S.anchorTime) / sd;
    let pos = Math.round(exact), off = 0;
    if (q && q > 1) { const bar = Math.floor(pos / n), r = Math.round((pos - bar * n) / q) * q; pos = bar * n + Math.min(r, n - 1); }
    else if (q === 0) off = Math.max(-0.5, Math.min(0.5, exact - Math.round(exact)));
    pos = ((pos % S.total) + S.total) % S.total;
    const entry = S.seq[Math.floor(pos / n)]; return { p: byId(P(), entry.pid), abs: entry.bar * n + pos % n, sIn: pos % n, entry, off };
  }
  function stepsHeld(seconds) { return Math.max(1, Math.round(seconds / stepDur())); }
  function retime() { if (S.playing) S.anchorTime = S.nextTime - S.pos * stepDur(); }
  function setMode(m) { S.mode = m; if (S.playing) start(); }
  function setRange(r) { S.range = r; if (S.playing && S.mode === "song") start(); }
  function position() {   // fraction of the whole sequence that has played, for a playhead
    if (!S.playing) return 0; const n = spb(P()), sd = stepDur();
    let pos = Math.floor((now() - S.anchorTime) / sd); pos = ((pos % S.total) + S.total) % S.total;
    return { frac: pos / S.total, entry: S.seq[Math.floor(pos / n)], sIn: pos % n, pos, total: S.total };
  }
  return { state: S, start, stop, quantizedHit, stepsHeld, retime, setMode, setRange, position, stepDur, get playing() { return S.playing; }, get mode() { return S.mode; }, get range() { return S.range; } };
}

// ---------- standard ABC import (single voice + chord symbols, e.g. the Nottingham collection) ----------
const MODE_DEGREE = { ion: 0, maj: 0, "": 0, dor: 1, phr: 2, lyd: 3, mix: 4, aeo: 5, min: 5, m: 5, loc: 6 };
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
const MODE_SCALE = { 0: "major", 1: "dorian", 2: "minor", 3: "major", 4: "mixolydian", 5: "minor", 6: "minor" };
const ENHARMONIC = { "C#": "Db", "D#": "Eb", "G#": "Ab", "A#": "Bb", "Gb": "F#", "Cb": "B", "Fb": "E", "E#": "F", "B#": "C" };
function parseKeyField(text) {
  const m = /^\s*([A-Ga-g])([#b]?)\s*([A-Za-z]*)/.exec(text || "C");
  if (!m) return null;
  const letter = m[1].toUpperCase(), acc = m[2], modeWord = m[3].toLowerCase().slice(0, 3);
  const deg = MODE_DEGREE[modeWord in MODE_DEGREE ? modeWord : (m[3].toLowerCase() === "minor" ? "min" : "")] ?? 0;
  const tonicPc = (NATURAL[LETTERS.indexOf(letter)] + (acc === "#" ? 1 : acc === "b" ? -1 : 0) + 12) % 12;
  const li = (LETTERS.indexOf(letter) - deg + 7) % 7, majPc = (tonicPc - MAJOR_STEPS[deg] + 12) % 12;
  let alt = ((majPc - NATURAL[li]) % 12 + 18) % 12 - 6;
  const majName = LETTERS[li] + (alt === 1 ? "#" : alt === -1 ? "b" : "");
  const f = FIFTHS[majName] ?? 0, sig = {};
  for (let i = 0; i < Math.abs(f); i++) sig[(f > 0 ? SHARP_ORDER : FLAT_ORDER)[i]] = f > 0 ? 1 : -1;
  const keyName = ENHARMONIC[letter + acc] || (letter + acc);
  return { tonicPc, sig, scale: MODE_SCALE[deg], key: KEYS.includes(keyName) ? keyName : KEYS[tonicPc] };
}
const ABC_TOKEN = /"[^"]*"|![^!\n]*!|\+[^+\n]*\+|\{[^}]*\}|\[[A-Za-z]:[^\]]*\]|\[[12]|\|[12]|\|:|:\||::|\|\]|\[\||\|\||\||\(\d(?::\d*)?(?::\d*)?|[()]|\[[^\]]+\]\d*\/*\d*|[_^=]*[A-Ga-g][,']*\d*\/*\d*-?|[zxZ]\d*\/*\d*|[<>]+|\\\n|\s+|./g;
function abcDur(numText, slashes, denText, unit) {
  const num = numText ? +numText : 1;
  const den = denText ? +denText : (slashes ? Math.pow(2, slashes.length) : 1);
  return unit * num / den;
}
function importAbc(P, text) {
  const warnings = [], lines = text.replace(/\r/g, "").split("\n");
  let title = "", meter = "4/4", unit = null, keyField = "C", bpm = null, body = [];
  let seenKey = false;
  for (const raw of lines) {
    const line = raw.replace(/%.*$/, "");
    const f = /^([A-Za-z]):(.*)$/.exec(line);
    if (f && !(seenKey && /^[A-Ga-gz\[\|"]/.test(line))) {
      const v = f[2].trim();
      if (f[1] === "T" && !title) title = v;
      else if (f[1] === "M") { if (!seenKey || !body.join("").trim()) meter = v; else { body.push("[M:" + v + "]"); } }
      else if (f[1] === "L") unit = v;
      else if (f[1] === "Q") bpm = v;
      else if (f[1] === "K") { if (!seenKey) { keyField = v; seenKey = true; } else body.push("[K:" + v + "]"); }
      else if (f[1] === "w" || f[1] === "W") { /* lyrics: dropped */ }
      continue;
    }
    if (seenKey && line.trim()) body.push(line);
  }
  if (!seenKey) throw new Error("No K: key line.");
  if (meter === "C") meter = "4/4"; if (meter === "C|") meter = "2/2";
  let [mn, md] = (/^(\d+)\/(\d+)$/.exec(meter) || [0, 4, 4]).slice(1).map(Number);
  if (!mn) throw new Error("No usable M: meter.");
  const barLen = mn / md;
  if (!unit) unit = barLen < 0.75 ? "1/16" : "1/8";
  const um = /^(\d+)\/(\d+)$/.exec(unit); const unitVal = um ? +um[1] / +um[2] : 1 / 8;
  const meterName = meter === "2/2" ? "4/4" : meter;
  if (!METERS.includes(meterName)) throw new Error("Meter " + meter + " isn't supported (use 4/4, 3/4, 2/4, 6/8, 9/8 or 12/8).");
  const grid = 16, stepsPerBar = Math.round(barLen * grid), compound = md === 8 && mn % 3 === 0;
  let key = parseKeyField(keyField); if (!key) throw new Error("Couldn't read the key " + keyField);
  const firstKey = key;
  if (bpm) { const q = /(?:(\d+)\/(\d+)\s*=\s*)?(\d+)/.exec(bpm); if (q) bpm = Math.round(+q[3] * (q[1] ? (+q[1] / +q[2]) / 0.25 : 1)); else bpm = null; }

  // ---- pass 1: tokens -> bars of events (time in whole notes within the bar) ----
  const bars = [];                      // [{events: [{t, dur, midi|null, chord?}], len}]
  let cur = { events: [], len: 0, accidentals: {} };
  let repeatStart = 0, ending1 = -1, tuplet = null, broken = 0, pendingChord = null, lastNote = null, tie = false;
  const noteMidi = (acc, letter, marks) => {
    const L = letter.toUpperCase(), oct = (letter === L ? 4 : 5) + (marks.split("'").length - 1) - (marks.split(",").length - 1);
    const k = L + oct;
    let alter;
    if (acc) { alter = acc === "^^" ? 2 : acc === "^" ? 1 : acc === "=" ? 0 : acc === "_" ? -1 : -2; cur.accidentals[k] = alter; }
    else alter = k in cur.accidentals ? cur.accidentals[k] : (key.sig[L] || 0);
    return (oct + 1) * 12 + NATURAL[LETTERS.indexOf(L)] + alter;
  };
  const pushEvent = (dur, midi) => {
    if (tuplet) { dur *= tuplet.factor; if (--tuplet.left <= 0) tuplet = null; }
    if (broken) { dur *= broken > 0 ? 1.5 : 0.5; if (lastNote) lastNote.dur *= broken > 0 ? 0.5 : 1.5; broken = 0; }
    const ev = { t: cur.len, dur, midi, chord: pendingChord }; pendingChord = null;
    if (tie && lastNote && midi != null && lastNote.midi === midi) { lastNote.dur += dur; cur.len += dur; tie = false; return; }
    tie = false; cur.events.push(ev); cur.len += dur; if (midi != null) lastNote = ev;
  };
  const closeBar = () => {
    if (cur.events.length || cur.len > 0) {
      if (cur.len > barLen + 1e-6 && bars.length) { const over = cur.len - barLen; const last = cur.events[cur.events.length - 1]; if (last) last.dur = Math.max(1e-6, last.dur - over); cur.len = barLen; }
      bars.push({ events: cur.events, len: cur.len });
      // a pickup bar at the very start is not part of an implicit repeat: the first ending supplies the pickup
      if (bars.length === 1 && cur.len < barLen - 1e-6 && repeatStart === 0) repeatStart = 1;
    }
    cur = { events: [], len: 0, accidentals: {} }; lastNote = null;
  };
  const doRepeat = () => {
    closeBar();
    const bodyEnd = ending1 >= 0 ? ending1 : bars.length;
    const body = bars.slice(repeatStart, bodyEnd).map(b => ({ events: b.events.map(e => ({ ...e })), len: b.len }));
    bars.push(...body); ending1 = -1; repeatStart = bars.length;
  };
  for (const tok of body.join("\n").match(ABC_TOKEN) || []) {
    if (/^\s+$/.test(tok) || tok === "\\\n" || tok === "(" || tok === ")") continue;
    if (tok[0] === '"') { if (!/^"[\^_<>@]/.test(tok)) pendingChord = tok.slice(1, -1); continue; }
    if (tok[0] === "!" || tok[0] === "+" || tok[0] === "{") continue;
    if (/^\[[A-Za-z]:/.test(tok)) { const f = tok[1], v = tok.slice(3, -1).trim(); if (f === "K") { const k2 = parseKeyField(v); if (k2) key = { ...k2, scale: firstKey.scale, key: firstKey.key }; } else if (f === "M" && v !== meter) { warnings.push("Meter changes to " + v + " mid-tune; the import stops there."); break; } continue; }
    if (tok === "[1" || tok === "|1") { closeBar(); ending1 = bars.length; continue; }
    if (tok === "[2" || tok === "|2") { closeBar(); continue; }
    if (tok === "|:") { closeBar(); repeatStart = bars.length; continue; }
    if (tok === ":|") { doRepeat(); continue; }
    if (tok === "::") { doRepeat(); repeatStart = bars.length; continue; }
    if (tok === "||" || tok === "|]" || tok === "[|") { closeBar(); repeatStart = bars.length; continue; }
    if (tok === "|") { closeBar(); continue; }
    if (tok[0] === "(" && /\d/.test(tok[1])) { const [pq, qq, rq] = tok.slice(1).split(":"); const pN = +pq, q = qq ? +qq : (pN === 3 ? 2 : pN === 2 || pN === 4 || pN === 8 ? 3 : compound ? 3 : 2), r = rq ? +rq : pN; tuplet = { factor: q / pN, left: r }; continue; }
    if (/^[<>]+$/.test(tok)) { broken = tok[0] === ">" ? tok.length : -tok.length; continue; }
    if (tok[0] === "[") {   // chord in brackets: keep the highest note
      const inner = tok.slice(1, tok.indexOf("]")), tail = /\](\d*)(\/*)(\d*)$/.exec(tok);
      const notes = inner.match(/[_^=]*[A-Ga-g][,']*\d*\/*\d*/g) || []; if (!notes.length) continue;
      let best = null, dur = null;
      for (const nt of notes) { const m = /^([_^=]*)([A-Ga-g])([,']*)(\d*)(\/*)(\d*)$/.exec(nt); const midi = noteMidi(m[1], m[2], m[3]); if (best == null || midi > best) { best = midi; } if (dur == null) dur = abcDur(m[4], m[5], m[6], unitVal); }
      if (tail && (tail[1] || tail[2])) dur = abcDur(tail[1], tail[2], tail[3], dur);
      pushEvent(dur, best); continue;
    }
    let m = /^([_^=]*)([A-Ga-g])([,']*)(\d*)(\/*)(\d*)(-?)$/.exec(tok);
    if (m) { pushEvent(abcDur(m[4], m[5], m[6], unitVal), noteMidi(m[1], m[2], m[3])); if (m[7]) tie = true; continue; }
    m = /^([zxZ])(\d*)(\/*)(\d*)$/.exec(tok);
    if (m) { if (m[1] === "Z") { closeBar(); for (let i = 0; i < (+m[2] || 1); i++) bars.push({ events: [], len: barLen }); } else pushEvent(abcDur(m[2], m[3], m[4], unitVal), null); continue; }
  }
  closeBar();
  if (!bars.length) throw new Error("No notes found.");
  // pickup bar: a short first bar is pushed to the end of its bar
  if (bars[0].len < barLen - 1e-6) { const pad = barLen - bars[0].len; bars[0].events.forEach(e => { e.t += pad; }); bars[0].len = barLen; }
  // short bars elsewhere (end of a part before a repeat sign, final bar) are padded with silence
  for (const b of bars) if (b.len < barLen - 1e-6) b.len = barLen;

  // ---- pass 2: bars -> patterns of 4 bars in the project's model ----
  const draft = { ...P, key: firstKey.key, scale: firstKey.scale, meter: meterName, grid, octave: 0 };
  const midis = []; for (const b of bars) for (const e of b.events) if (e.midi != null) midis.push(e.midi);
  let bestOct = 0, bestErr = Infinity;
  for (const oct of [-1, 0, 1]) { draft.octave = oct; let err = 0; for (const m of midis) err += Math.abs(midiOfRow(draft, rowOfMidi(draft, m)) - m); if (err < bestErr) { bestErr = err; bestOct = oct; } }
  draft.octave = bestOct;
  const approx = midis.filter(m => midiOfRow(draft, rowOfMidi(draft, m)) !== m).length;
  if (approx) warnings.push(approx + " note(s) outside the " + draft.key + " " + draft.scale + " scale were moved to the nearest scale note.");
  const ps = parentSteps(draft), tonic = tonicPc(draft);
  const chordDegree = sym => { const m = /^([A-G])([#b]?)/.exec(sym || ""); if (!m) return -1; const pc = pitchClass(m[1] + m[2]); for (let d = 0; d < 7; d++) if ((tonic + ps[d]) % 12 === pc) return d; return -1; };
  const patterns = [], song = [];
  for (let i = 0; i < bars.length; i += 4) {
    const chunk = bars.slice(i, i + 4), pat = newPattern("Tune " + (patterns.length + 1), chunk.length);
    chunk.forEach((b, bi) => {
      let chord = -1;
      for (const e of b.events) if (e.chord && chord < 0) chord = chordDegree(e.chord);
      pat.chords[bi] = chord;
      for (const e of b.events) {
        if (e.midi == null) continue;
        const start = clamp(Math.round(e.t * grid), 0, stepsPerBar - 1), end = clamp(Math.round((e.t + e.dur) * grid), start + 1, stepsPerBar);
        addMelodyNote(draft, pat, bi * stepsPerBar + start, rowOfMidi(draft, e.midi), end - start);
      }
    });
    patterns.push(pat); song.push({ pattern: pat.id, repeat: 1, section: Math.floor(i / 8) % 2 === 0 ? "verse" : "chorus" });
  }
  return { patterns, song, key: draft.key, scale: draft.scale, meter: meterName, grid, octave: bestOct, bpm, title: title || "Imported tune", bars: bars.length, warnings };
}

window.Groove = { uid, clone, clamp, KEYS, SCALES, DRUMS, DRUM_BY_ID, SECTION_TYPES, METERS, SOUNDS, GM_SOUNDS, GM_FAMILIES, SOUND_BY_ID, STAGE_STANDIN, FULL_SOUNDFONT_URL, CONTROLLERS, ROLE_LABEL, SOLFEGE,
  meterParts, instEvents, density, clearInstrument, importAbc, hitsInBar, addChordHit, arpNotes, chordLayer, chordEventsAt, chordSoundingAt, DEFAULT_ARP, ARP_MODES, ARP_RHYTHMS,
  DRUM_STYLES, drumStylesFor, generateDrums, BASS_STYLES, generateBass, mulberry, GROOVES, DEFAULT_FEEL, DEFAULT_INST_FEEL, feelOf, feelEvent, snapInstrument,
  newPattern, defaultDeck, demoProject, blankProject, normalizeProject, beats, spb, scaleDef, nRows, tonicPc, midiOfRow, rowOfMidi, keyInfo, noteName, rowName,
  chordInfo, barChord, bassEvents, toggleDrum, addDrumHit, addMelodyNote, noteAt, addLayerNote, setBars, remapSteps, clearBar, copyBarNext,
  exportYuE2, exportStandard, exportAbc, scorePackage, checkAbc, encodeM3DS, byId, layerIds,
  AUTOSAVE, LIB, HANDOFF, loadAutosave, saveAutosave, library, setLibrary, saveToLibrary, safeName, download, Sequencer };
})();

// Build library/tunes.json from the Nottingham collection and check every tune imports cleanly.
global.window = {}; require(__dirname + '/../groove-core.js'); const G = global.window.Groove;
const fs = require('fs'), path = require('path'), dir = process.argv[2] || '.';
const GENRE = { ashover: 'Ashover collection', hpps: 'Hornpipe', jigs: 'Jig', morris: 'Morris', playford: 'Playford', 'reelsa-c': 'Reel', 'reelsd-g': 'Reel', 'reelsh-l': 'Reel', 'reelsm-q': 'Reel', 'reelsr-t': 'Reel', 'reelsu-z': 'Reel', slip: 'Slip jig', waltzes: 'Waltz', xmas: 'Christmas' };
const P0 = G.normalizeProject(G.demoProject()); const tunes = [], fails = {};
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.abc'))) {
  const text = fs.readFileSync(path.join(dir, f), 'utf8');
  for (const block of text.split(/\n(?=X:)/)) {
    if (!/^X:/.test(block.trim())) continue;
    const abc = block.trim().split('\n').filter(l => !/^(S|Y|%)/.test(l) && !/^% /.test(l)).join('\n') + '\n';
    const title = (/^T:\s*(.*)$/m.exec(abc) || [])[1] || '?';
    try {
      const r = G.importAbc(P0, abc);
      const P = { ...P0, patterns: r.patterns, song: r.song, key: r.key, scale: r.scale, meter: r.meter, grid: r.grid, octave: r.octave };
      const chk = G.checkAbc(P, G.exportYuE2(P, true)); if (chk.issues.length) throw new Error('export: ' + chk.issues[0]);
      const notes = r.patterns.reduce((a, p) => a + p.melody.length, 0); if (notes < 8) throw new Error('too few notes');
      tunes.push({ t: title.trim(), k: r.key + (r.scale === 'major' ? '' : ' ' + r.scale), m: r.meter, g: GENRE[f.replace('.abc', '')] || '', b: r.bars, a: abc });
    } catch (e) { fails[e.message.slice(0, 60)] = (fails[e.message.slice(0, 60)] || 0) + 1; }
  }
}
tunes.sort((a, b) => a.t.localeCompare(b.t));
fs.mkdirSync(__dirname + '/../library', { recursive: true });
fs.writeFileSync('/home/user/groovebox/library/tunes.json', JSON.stringify({ source: 'Nottingham Music Database (ABC version by the ABC Music project; cleaned by Jukedeck)', tunes }));
console.log('tunes:', tunes.length, 'bytes:', fs.statSync('/home/user/groovebox/library/tunes.json').size); console.log('failures:', fails);
const meters = {}; for (const t of tunes) meters[t.m] = (meters[t.m] || 0) + 1; console.log('meters:', meters);

const fs = require('fs'); const c = require('spessasynth_core');
const buf = fs.readFileSync('FluidR3Mono_GM.sf3');
const bank = c.SoundBankLoader.fromArrayBuffer(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const KEEP = new Set([4,11,12,24,33,38,46,48,52,53,56,65,73,80,81,88,107,108,113,114,115,116]);
const KEEP_DRUMS = new Set([0,25]);
for (const p of [...bank.presets]) {
  const keep = p.isGMGSDrum || p.bankMSB === 128 ? KEEP_DRUMS.has(p.program) : (p.bankMSB === 0 && KEEP.has(p.program));
  if (!keep) bank.deletePreset(p);
}
bank.removeUnusedElements();
console.log('kept presets:', bank.presets.map(p => (p.isGMGSDrum ? 'D' : '') + p.program + ':' + p.name).join(' | '));
console.log('instruments', bank.instruments.length, 'samples', bank.samples.length);
(async () => {
  await c.BasicSoundBank.isSF3DecoderReady;
  const opts = process.argv[2] ? JSON.parse(process.argv[2]) : {};
  const out = await bank.writeSF2(opts);
  const name = process.argv[3] || 'subset.sf2';
  fs.writeFileSync(name, Buffer.from(out));
  console.log(name, (out.byteLength / 1e6).toFixed(2), 'MB');
})().catch(e => { console.error(e); process.exit(1); });

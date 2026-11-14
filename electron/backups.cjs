const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const LIMIT = 20;
function validate(text) {
  if (Buffer.byteLength(text) > 100 * 1024 * 1024) throw Error('Backup exceeds 100 MB');
  const value = JSON.parse(text);
  if (!value || typeof value.settings?.data !== 'object' || !value.settings.data || !Array.isArray(value.histories) || !Array.isArray(value.banners)) throw Error('Unsupported backup: expected settings, histories and banners');
  if (value.histories.some(h => !h || typeof h.banner !== 'string' || !Number.isFinite(h.itemID))) throw Error('Invalid history record');
  if (value.banners.some(b => !b || !Number.isFinite(b.itemID))) throw Error('Invalid custom banner');
  return value;
}
function writeAtomic(file, text) {
  fs.mkdirSync(path.dirname(file), {recursive:true});
  const temp = file + '.tmp';
  const fd = fs.openSync(temp, 'w');
  try { fs.writeFileSync(fd, text); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(temp, file);
}
function list(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(n => /^backup-.*\.json$/.test(n)).sort().reverse();
}
function save(dir, text, {force=false}={}) {
  validate(text);
  const digest = crypto.createHash('sha256').update(text).digest('hex');
  const latest = list(dir)[0];
  if (!force && latest && fs.readFileSync(path.join(dir, latest), 'utf8') === text) return latest;
  const name = `backup-${new Date().toISOString().replace(/[:.]/g,'-')}-${digest.slice(0,8)}.json`;
  writeAtomic(path.join(dir, name), text);
  for (const old of list(dir).slice(LIMIT)) fs.unlinkSync(path.join(dir, old));
  return name;
}
module.exports={validate,writeAtomic,list,save,LIMIT};

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const engine = () => import('../src/lib/helpers/journal/engine.js');
const chars = JSON.parse(
	fs.readFileSync(path.resolve(__dirname, '../src/lib/data/characters.json'))
).data;
const weapons = JSON.parse(
	fs.readFileSync(path.resolve(__dirname, '../src/lib/data/weapons.json'))
).data;
test('catalog uses unique inventory IDs and nonempty, attainable set thresholds', async () => {
	const e = await engine();
	const c = e.catalogOf(chars, weapons);
	assert.equal(c.length, new Set(c.map((x) => x.itemID)).size);
	assert.equal(c.find((x) => x.name === 'skirk').type, 'character');
	const r = e.evaluate(c);
	assert.ok(r.achievements.length > 200);
	assert.ok(r.sets.length > 30);
	assert.ok(r.achievements.every((a) => a.target > 0));
	assert.equal(e.displayName('weapon-test'), 'Weapon Test');
	const owned = Object.fromEntries(c.map((x) => [x.itemID, { wish: 7, manual: 0 }]));
	const full = e.evaluate(c, owned);
	assert.ok(full.sets.every((s) => s.current === s.total));
	assert.ok(full.achievements.filter((a) => a.category === 'Collections').every((a) => a.earned));
});
test('existing inventory credits collections and exact C6/R5 copy boundaries', async () => {
	const e = await engine();
	const c = e.catalogOf(chars, weapons);
	const ch = c.find((x) => x.name === 'skirk'),
		w = c.find((x) => x.type === 'weapon');
	let owned = { [ch.itemID]: { wish: 6, manual: 0 }, [w.itemID]: { wish: 4, manual: 0 } };
	let r = e.evaluate(c, owned);
	assert.equal(r.characters, 1);
	assert.equal(r.weapons, 1);
	assert.ok(!r.achievements.find((a) => a.id === 'c6-1').earned);
	assert.ok(!r.achievements.find((a) => a.id === 'r5-1').earned);
	owned[ch.itemID].manual = 1;
	owned[w.itemID].wish = 5;
	r = e.evaluate(c, owned);
	assert.ok(r.achievements.find((a) => a.id === 'c6-1').earned);
	assert.ok(r.achievements.find((a) => a.id === 'r5-1').earned);
});
test('legacy records count journey without claiming unverifiable luck', async () => {
	const e = await engine();
	const r = e.ingest(e.emptyStats(), [
		{ rarity: 5, pity: 1, status: 'win', banner: 'character-event', bannerName: 'old' }
	]);
	assert.equal(r.total, 1);
	assert.equal(r.fives, 1);
	assert.equal(r.one, 0);
	assert.equal(r.wins, 0);
	assert.equal(Object.keys(r.banners).length, 1);
});
test('normal odds, custom odds, and explicit ten-pull boundaries stay separate', async () => {
	const e = await engine();
	const row = {
		rarity: 5,
		pity: 1,
		status: 'win',
		journalMode: 'normal',
		journalBatch: 'a',
		journalBatchSize: 10
	};
	let r = e.ingest(
		e.emptyStats(),
		Array.from({ length: 10 }, () => ({ ...row }))
	);
	assert.equal(r.double, 1);
	assert.equal(r.triple, 1);
	assert.equal(r.one, 10);
	r = e.ingest(
		e.emptyStats(),
		Array.from({ length: 10 }, () => ({ ...row, journalMode: 'sandbox' }))
	);
	assert.equal(r.sandbox, 10);
	assert.equal(r.double, 0);
	assert.equal(r.one, 0);
	r = e.ingest(
		e.emptyStats(),
		Array.from({ length: 10 }, (_, i) => ({
			...row,
			journalBatch: 'single-' + i,
			journalBatchSize: 1
		}))
	);
	assert.equal(r.double, 0);
	r = e.ingest(
		e.emptyStats(),
		Array.from({ length: 20 }, () => ({ ...row, journalBatchSize: 20 }))
	);
	assert.equal(r.double, 0);
});
test('earned achievements keep dates and points after history or inventory removal', async () => {
	const e = await engine();
	const c = e.catalogOf(chars, weapons);
	const first = e.evaluate(c, {}, { ...e.emptyStats(), total: 100 });
	const again = e.evaluate(c, {}, e.emptyStats(), first.earned);
	assert.deepEqual(again.earned, first.earned);
	assert.equal(again.points, first.points);
	assert.ok(again.titles.find((x) => x.id === 'traveler').unlocked);
	assert.equal(new Set(again.achievements.map((a) => a.id)).size, again.achievements.length);
});

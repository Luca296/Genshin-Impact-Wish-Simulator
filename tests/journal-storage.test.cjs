const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
require('fake-indexeddb/auto');
global.localStorage = new (class {
	data = new Map();
	getItem(k) {
		return this.data.get(k) || null;
	}
	setItem(k, v) {
		this.data.set(k, String(v));
	}
})();
global.document = new EventTarget();
test('journal migrates, persists once, recovers interrupted wishes and separates altered odds', async () => {
	const bundle = await require('esbuild').build({
		entryPoints: ['tests/journal-entry.js'],
		bundle: true,
		platform: 'node',
		format: 'cjs',
		write: false,
		alias: {
			$lib: path.resolve('src/lib'),
			'$app/environment': path.resolve('tests/environment.js')
		},
		plugins: [
			{
				name: 'test-glob',
				setup(build) {
					build.onLoad({ filter: /journal[\\/]index.js$/ }, (args) => ({
						contents: fs
							.readFileSync(args.path, 'utf8')
							.replace(/import.meta.glob\([^;]+\)/, '({})'),
						resolveDir: path.dirname(args.path),
						loader: 'js'
					}));
				}
			}
		],
		logLevel: 'silent'
	});
	const mod = { exports: {} };
	new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(
		require,
		mod,
		mod.exports
	);
	const { loadJournal, recordJournalBatch, equipTitle, storageLocal, HistoryManager, wishMode } =
		mod.exports;
	await HistoryManager.addHistory({
		itemID: 10000003,
		banner: 'character-event',
		rarity: 5,
		pity: 1
	});
	await loadJournal();
	assert.equal(storageLocal.get('journal').stats.total, 1);
	assert.equal(storageLocal.get('journal').stats.one, 0);
	let records = [];
	for (let i = 0; i < 10; i++) {
		const r = {
			itemID: 10000003,
			banner: 'character-event',
			rarity: 5,
			pity: 1,
			journalMode: 'normal',
			journalBatch: 'verified-ten',
			journalBatchSize: 10
		};
		const id = await HistoryManager.addHistory(r);
		records.push({ ...r, journalHistoryID: id });
	}
	recordJournalBatch(records);
	let saved = storageLocal.get('journal');
	assert.equal(saved.stats.total, 11);
	assert.equal(saved.stats.double, 1);
	recordJournalBatch(records);
	await loadJournal();
	assert.equal(storageLocal.get('journal').stats.total, 11);
	assert.equal(storageLocal.get('journal').stats.double, 1);
	await HistoryManager.addHistory({
		itemID: 10000003,
		banner: 'character-event',
		rarity: 5,
		pity: 1,
		journalMode: 'normal'
	});
	await loadJournal();
	saved = storageLocal.get('journal');
	assert.equal(saved.stats.total, 12);
	assert.equal(saved.stats.one, 11);
	assert.ok(saved.earned['one-1']);
	equipTitle('legend');
	assert.notEqual(storageLocal.get('journal').title, 'legend');
	equipTitle('traveler');
	assert.equal(storageLocal.get('journal').title, 'traveler');
	assert.equal(wishMode('7.1', 'character-event'), 'normal');
	assert.equal(wishMode('Custom', 'character-event'), 'sandbox');
	storageLocal.set('probabilityRates', { 'character-event': { baseRate5: 100 } });
	assert.equal(wishMode('7.1', 'character-event'), 'sandbox');
	storageLocal.set('probabilityRates', { 'character-event': { baseRate5: 0.6 } });
	assert.equal(wishMode('7.1', 'character-event'), 'normal');
});

// Build-time only. Source is pinned in combat-provenance.json; runtime stays offline.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const source = path.resolve(root, '../audit/combat-source/dist');
const db = require(path.join(source, 'genshindb-nodata.js'));
const folders = ['characters', 'talents', 'constellations', 'weapons'];
const hashes = {};
for (const folder of folders) {
	const file = `data/gzips/english-${folder}.min.json.gzip`;
	const bytes = fs.readFileSync(path.join(source, file));
	hashes[file] = crypto.createHash('sha256').update(bytes).digest('hex');
	db.addData(JSON.parse(zlib.gunzipSync(bytes)));
}
const clean = (x) =>
	x &&
	JSON.parse(
		JSON.stringify(x, (k, v) =>
			['images', 'url', 'costs', 'cv', 'story', 'descriptionRaw', 'flavorText'].includes(k)
				? undefined
				: v
		)
	);
const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const aliases = {
	'prospector-drill': "Prospector's Drill",
	'jadefall-splendor': "Jadefall's Splendor",
	'bloodtained-greatsword': 'Bloodtainted Greatsword'
};
const output = {
	version: fs.readFileSync(path.join(source, 'genshin-db.version'), 'utf8').trim(),
	characters: {},
	weapons: {}
};
const coverage = [];
for (const folder of ['characters', 'weapons']) {
	const sourceItems = db[folder]('names', { matchCategories: true, verboseCategories: true });
	for (const item of JSON.parse(fs.readFileSync(path.join(root, `src/lib/data/${folder}.json`)))
		.data) {
		// Names are checked as well as IDs, because upstream simulator IDs can be wrong.
		const match = sourceItems.find(
			(x) => normalize(x.name) === normalize(aliases[item.name] || item.name)
		);
		const record = match && clean(match);
		if (record) {
			record.levels = {};
			for (let level = 1; level <= 90; level++) {
				const stats = match.stats?.(level, '+');
				if (stats) record.levels[level] = stats;
			}
			if (folder === 'characters') {
				record.talents = clean(db.talents(match.name));
				record.constellations = clean(db.constellations(match.name));
				record.constellationImages = db.constellations(match.name)?.images;
				record.talentImages = db.talents(match.name)?.images;
			}
			output[folder][item.name] = record;
		}
		coverage.push({
			name: item.name,
			localID: item.itemID,
			gameID: match?.id || null,
			stats: !!record && Object.keys(record.levels).length > 0,
			talents: !!record?.talents?.combat1?.attributes?.parameters,
			constellations: !!record?.constellations?.c6,
			refinements: !!record?.r5
		});
	}
}
const classes = {
	WEAPON_SWORD_ONE_HAND: 'sword',
	WEAPON_CLAYMORE: 'claymore',
	WEAPON_POLE: 'polearm',
	WEAPON_BOW: 'bow',
	WEAPON_CATALYST: 'catalyst'
};
const characters = JSON.parse(
	fs.readFileSync(path.join(root, 'src/lib/data/characters.json'))
).data;
fs.writeFileSync(
	path.join(root, 'src/lib/data/equipment-classes.json'),
	JSON.stringify(
		Object.fromEntries(
			characters.map((c) => [c.itemID, classes[output.characters[c.name]?.weaponType] || null])
		),
		null,
		2
	) + '\n'
);
fs.writeFileSync(path.join(root, 'src/lib/data/combat.json'), JSON.stringify(output));
fs.writeFileSync(
	path.join(root, 'src/lib/data/combat-coverage.json'),
	JSON.stringify(coverage, null, 2) + '\n'
);
fs.writeFileSync(
	path.join(root, 'combat-provenance.json'),
	JSON.stringify(
		{
			source: 'https://github.com/theBowja/genshin-db-dist',
			version: output.version,
			imported: new Date().toISOString(),
			hashes
		},
		null,
		2
	)
);
fs.copyFileSync(path.join(source, 'LICENSE'), path.join(root, 'COMBAT-DATA-LICENSE.txt'));
console.log('Coverage', coverage.filter((x) => x.stats).length, '/', coverage.length);
console.log(
	'Missing',
	coverage.filter((x) => !x.stats).map((x) => x.name)
);
console.log('Character talents', coverage.filter((x) => x.talents).length);

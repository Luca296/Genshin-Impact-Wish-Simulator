// Pure journal rules. Saves use stable IDs; new definitions never revoke earned entries.
export const elements = ['anemo', 'geo', 'electro', 'dendro', 'hydro', 'pyro', 'cryo'];
export const weaponTypes = ['sword', 'claymore', 'polearm', 'bow', 'catalyst'];
export const displayName = (name) =>
	({ nodkrai: 'Nod-Krai', nordkrai: 'Nod-Krai', snezhnaya: 'Snezhnaya', abyss: 'Beyond Teyvat' }[
		name
	] || name.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
export function catalogOf(characters, weapons) {
	// Inventory is keyed by itemID. Match its first-entry lookup for upstream duplicate IDs.
	const seen = new Set();
	return [
		...characters.map((x) => ({ ...x, type: 'character' })),
		...weapons.map((x) => ({ ...x, type: 'weapon' }))
	].filter((x) => {
		if (seen.has(x.itemID)) return false;
		seen.add(x.itemID);
		return true;
	});
}
export function buildSets(catalog) {
	const sets = [];
	const add = (id, name, description, items, icon = 'star') => {
		if (items.length) sets.push({ id, name, description, items, icon });
	};
	const chars = catalog.filter((x) => x.type === 'character'),
		weapons = catalog.filter((x) => x.type === 'weapon');
	add(
		'characters',
		'Traveling Companions',
		'Every character in the collection.',
		chars,
		'character'
	);
	add('weapons', 'The Armory', 'Every weapon in the collection.', weapons, 'weapon');
	for (const region of [...new Set(chars.map((x) => x.origin))].filter(Boolean))
		add(
			'region-' + region,
			displayName(region),
			'Gather the companions of ' + displayName(region) + '.',
			chars.filter((x) => x.origin === region),
			'character'
		);
	for (const element of elements)
		add(
			'element-' + element,
			displayName(element) + ' Affinity',
			'Collect the bearers of ' + displayName(element) + '.',
			chars.filter((x) => x.vision === element),
			element
		);
	for (const type of weaponTypes)
		add(
			'weapon-' + type,
			displayName(type) + ' Archive',
			'Collect every ' + type + ' in the armory.',
			weapons.filter((x) => x.weaponType === type),
			'weapon'
		);
	for (const rarity of [4, 5]) {
		add(
			'characters-' + rarity,
			rarity === 5 ? 'A Gathering of Stars' : 'Trusted Companions',
			'Collect every ' + rarity + '-star character.',
			chars.filter((x) => x.rarity === rarity),
			'character'
		);
		add(
			'weapons-' + rarity,
			rarity === 5 ? 'Treasury of Legends' : 'Fine Craftsmanship',
			'Collect every ' + rarity + '-star weapon.',
			weapons.filter((x) => x.rarity === rarity),
			'weapon'
		);
	}
	const themes = [
		[
			'knights',
			'Knights of Favonius',
			[
				'jean',
				'amber',
				'kaeya',
				'lisa',
				'klee',
				'albedo',
				'eula',
				'noelle',
				'sucrose',
				'mika',
				'dahlia'
			]
		],
		['liyue-qixing', 'Affairs of Liyue', ['ningguang', 'keqing', 'ganyu', 'yelan']],
		[
			'archons',
			'Thrones of Teyvat',
			['venti', 'zhongli', 'raiden-shogun', 'nahida', 'furina', 'mavuika']
		],
		['kam isato', 'The Kamisato Household', ['kamisato-ayaka', 'kamisato-ayato', 'thoma']],
		['academia', 'Sumeru Scholars', ['alhaitham', 'kaveh', 'faruzan', 'layla', 'cyno', 'tighnari']],
		['hearth', 'House of the Hearth', ['arlecchino', 'lyney', 'lynette', 'freminet']],
		['adepti', 'Clouds over Jueyun', ['xiao', 'ganyu', 'shenhe', 'xianyun', 'yanfei']],
		[
			'standard',
			'Familiar Faces',
			['jean', 'diluc', 'mona', 'keqing', 'qiqi', 'tighnari', 'dehya', 'yumemizuki-mizuki']
		],
		['crux', 'Aboard the Alcor', ['beidou', 'kaedehara-kazuha']],
		['idols', 'An Audience Awaits', ['barbara', 'yun-jin', 'nilou', 'furina']]
	];
	for (const [id, name, names] of themes)
		add(
			'theme-' + id.replace(/ /g, ''),
			name,
			'Bring this company together.',
			chars.filter((x) => names.includes(x.name)),
			'star'
		);
	return sets;
}
export function emptyStats() {
	return {
		total: 0,
		fours: 0,
		fives: 0,
		early: 0,
		one: 0,
		high: 0,
		wins: 0,
		losses: 0,
		captured: 0,
		double: 0,
		triple: 0,
		purple: 0,
		sandbox: 0,
		banners: {},
		types: {}
	};
}
export function ingest(stats, records, { legacy = false } = {}) {
	const next = {
		...emptyStats(),
		...stats,
		banners: { ...stats?.banners },
		types: { ...stats?.types }
	};
	for (const r of records) {
		next.total++;
		next.fours += r.rarity === 4 ? 1 : 0;
		next.fives += r.rarity === 5 ? 1 : 0;
		if (r.bannerName) next.banners[r.bannerName] = true;
		if (r.banner) next.types[r.banner] = (next.types[r.banner] || 0) + 1;
		if (r.journalMode === 'sandbox') next.sandbox++;
		// Old histories do not prove which probability overrides were active.
		if (legacy || r.journalMode !== 'normal') continue;
		if (r.rarity === 5) {
			next.early += r.pity <= 10 ? 1 : 0;
			next.one += r.pity === 1 ? 1 : 0;
			next.high += r.pity >= 80 ? 1 : 0;
			next.wins += r.status === 'win' ? 1 : 0;
			next.losses += r.status === 'lose' ? 1 : 0;
			next.captured += r.captured ? 1 : 0;
		}
	}
	// A batch is explicitly identified, never inferred from adjacent timestamps.
	const batches = new Map();
	for (const r of records)
		if (!legacy && r.journalMode === 'normal' && r.journalBatch && r.journalBatchSize === 10) {
			const a = batches.get(r.journalBatch) || [];
			a.push(r);
			batches.set(r.journalBatch, a);
		}
	for (const batch of batches.values())
		if (batch.length === 10) {
			const n = batch.filter((r) => r.rarity === 5).length;
			next.double += n >= 2 ? 1 : 0;
			next.triple += n >= 3 ? 1 : 0;
			next.purple += batch.filter((r) => r.rarity >= 4).length >= 4 ? 1 : 0;
		}
	return next;
}
export function evaluate(catalog, owned = {}, stats = emptyStats(), previous = {}) {
	const qty = (x) =>
		Math.max(0, Number(owned[x.itemID]?.wish || 0) + Number(owned[x.itemID]?.manual || 0));
	const chars = catalog.filter((x) => x.type === 'character' && qty(x) > 0),
		weapons = catalog.filter((x) => x.type === 'weapon' && qty(x) > 0);
	const sets = buildSets(catalog).map((s) => ({
		...s,
		current: s.items.filter((x) => qty(x) > 0).length,
		total: s.items.length
	}));
	const definitions = [];
	const series = (key, title, description, category, value, targets, icon = 'star') =>
		targets.forEach((target, i) =>
			definitions.push({
				id: key + '-' + target,
				title:
					targets.length > 1
						? title + ' ' + ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'][i]
						: title,
				description: description.replace('{n}', target.toLocaleString()),
				category,
				current: Math.min(value, target),
				target,
				points: i < 2 ? 5 : i < 4 ? 10 : 20,
				icon
			})
		);
	series(
		'wishes',
		'A Wish upon a Star',
		'Make {n} wishes.',
		'Journey',
		stats.total,
		[1, 10, 50, 100, 500, 1000, 5000, 10000, 50000]
	);
	series(
		'four-stars',
		'Violet Skies',
		'Obtain {n} four-star items.',
		'Journey',
		stats.fours,
		[1, 10, 50, 100, 500, 1000]
	);
	series(
		'five-stars',
		'Golden Horizons',
		'Obtain {n} five-star items.',
		'Journey',
		stats.fives,
		[1, 5, 10, 25, 50, 100, 500]
	);
	series(
		'banners',
		'Across the Ages',
		'Wish on {n} different named banners.',
		'Journey',
		Object.keys(stats.banners).length,
		[1, 5, 10, 25, 50, 100]
	);
	for (const [type, label] of [
		['character-event', 'Intertwined Destinies'],
		['weapon-event', 'Forged by Fate'],
		['standard', 'Wanderlust'],
		['beginner', 'First Steps'],
		['chronicled', 'Echoes of the Past']
	])
		series(
			'type-' + type,
			label,
			'Make {n} wishes on ' + type.replace(/-/g, ' ') + ' banners.',
			'Journey',
			stats.types[type] || 0,
			type === 'beginner' ? [10, 20] : [1, 100, 1000]
		);
	series(
		'characters',
		'New Faces',
		'Own {n} unique characters.',
		'Companions',
		chars.length,
		[1, 5, 10, 25, 50, 75, 100]
	);
	series(
		'weapons',
		'An Expanding Armory',
		'Own {n} unique weapons.',
		'Armory',
		weapons.length,
		[1, 10, 25, 50, 75, 100]
	);
	series(
		'c6',
		'Written in the Stars',
		'Activate C6 on {n} different characters.',
		'Companions',
		chars.filter((x) =>
			owned[x.itemID]?.progressionVersion === 2 ? owned[x.itemID].activated >= 6 : qty(x) >= 7
		).length,
		[1, 5, 10, 25, 50]
	);
	series(
		'c1',
		'A Deeper Bond',
		'Activate C1 on {n} different characters.',
		'Companions',
		chars.filter((x) =>
			owned[x.itemID]?.progressionVersion === 2 ? owned[x.itemID].activated >= 1 : qty(x) >= 2
		).length,
		[1, 5, 10, 25, 50]
	);
	series(
		'r5',
		'Masterwork Collection',
		'Refine {n} different weapons to R5.',
		'Armory',
		weapons.filter((x) =>
			owned[x.itemID]?.progressionVersion === 2
				? owned[x.itemID].copies?.some((c) => c.refinement >= 5)
				: qty(x) >= 5
		).length,
		[1, 5, 10, 25, 50, 100]
	);
	series(
		'elements',
		'Seven Colors',
		'Own characters of {n} different elements.',
		'Companions',
		new Set(chars.map((x) => x.vision)).size,
		[3, 5, 7]
	);
	series(
		'weapon-types',
		'Tools of the Trade',
		'Own weapons of {n} different types.',
		'Armory',
		new Set(weapons.map((x) => x.weaponType)).size,
		[3, 5]
	);
	for (const s of sets)
		series(
			'set-' + s.id,
			s.name,
			'Collect {n} of ' + s.total + ' entries in ' + s.name + '.',
			'Collections',
			s.current,
			[
				...new Set([
					Math.ceil(s.total * 0.25),
					Math.ceil(s.total * 0.5),
					Math.ceil(s.total * 0.75),
					s.total
				])
			],
			s.icon
		);
	for (const [key, title, desc, targets] of [
		['early', 'Ahead of Destiny', 'Obtain a five-star at 10 pity or less {n} times.', [1, 5, 10]],
		['one', 'Lightning Strikes', 'Obtain a five-star at exactly 1 pity {n} times.', [1, 3]],
		['high', 'A Long-Awaited Reunion', 'Obtain a five-star at 80 pity or more {n} times.', [1, 10]],
		[
			'wins',
			'Fortune Smiles',
			'Win a non-guaranteed featured character roll {n} times.',
			[1, 10, 50]
		],
		['losses', 'An Unexpected Guest', 'Lose a featured character roll {n} times.', [1, 10, 50]],
		['captured', 'A Radiant Turn', 'Trigger Capturing Radiance {n} times.', [1, 5]],
		[
			'double',
			'A Sky Full of Gold',
			'Obtain two or more five-stars in one ten-pull {n} times.',
			[1, 5]
		],
		[
			'triple',
			'Constellation of Miracles',
			'Obtain three or more five-stars in one ten-pull {n} times.',
			[1]
		],
		[
			'purple',
			'Violet Bouquet',
			'Obtain four or more four-star or better items in one ten-pull {n} times.',
			[1, 10]
		]
	])
		series(key, title, desc, 'Fortune', stats[key], targets);
	series(
		'sandbox',
		'Dreams without Rules',
		'Make {n} wishes on custom banners or with altered odds.',
		'Dreams',
		stats.sandbox,
		[1, 10, 100, 1000]
	);
	const earned = { ...previous };
	const now = new Date().toISOString();
	const achievements = definitions.map((d) => {
		if (d.current >= d.target && !earned[d.id]) earned[d.id] = now;
		return { ...d, earned: earned[d.id] || null };
	});
	const points = achievements.reduce((a, x) => a + (x.earned ? x.points : 0), 0);
	const titles = [
		{ id: 'traveler', name: 'Traveler', threshold: 0 },
		{ id: 'stargazer', name: 'Stargazer', threshold: 50 },
		{ id: 'collector', name: 'Collector of Destinies', threshold: 200 },
		{ id: 'archivist', name: 'Keeper of the Archive', threshold: 500 },
		{ id: 'constellation', name: 'Constellation Weaver', threshold: 1000 },
		{ id: 'legend', name: 'A Sky Full of Wishes', threshold: 1500 }
	].map((t) => ({ ...t, unlocked: points >= t.threshold }));
	return {
		achievements,
		earned,
		sets,
		points,
		titles,
		characters: chars.length,
		weapons: weapons.length
	};
}

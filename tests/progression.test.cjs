const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createRequire } = require('node:module');
require('fake-indexeddb/auto');
global.document = new EventTarget();
global.window = {};
global.localStorage = new (class {
	data = new Map();
	getItem(k) {
		return this.data.get(k) ?? null;
	}
	setItem(k, v) {
		this.data.set(k, String(v));
	}
	removeItem(k) {
		this.data.delete(k);
	}
	clear() {
		this.data.clear();
	}
})();
const combat = require('../src/lib/data/combat.json');
let api;
test('manual progression and real stat calculations', async (t) => {
	const bundle = await require('esbuild').build({
		entryPoints: ['tests/progression-entry.js'],
		bundle: true,
		platform: 'node',
		format: 'cjs',
		write: false,
		alias: {
			$lib: path.resolve('src/lib'),
			'$app/environment': path.resolve('tests/environment.js')
		},
		logLevel: 'silent'
	});
	const mod = { exports: {} };
	new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(
		require,
		mod,
		mod.exports
	);
	api = mod.exports;
	await t.test('catalogue IDs and names are unique', () => {
		const all = ['characters', 'weapons'].flatMap((f) => require(`../src/lib/data/${f}.json`).data);
		assert.equal(new Set(all.map((x) => x.itemID)).size, all.length);
		assert.equal(new Set(all.map((x) => x.name)).size, all.length);
	});
	await t.test('legacy counts become unspent materials and separate R1 copies, once', async () => {
		localStorage.clear();
		api.storageLocal.set('ownedItem', {
			29: { manual: 2, wish: 100 },
			120: { manual: 1, wish: 5 }
		});
		await api.initializeProgression();
		const first = JSON.stringify(api.owneditem.getAll());
		await api.initializeProgression();
		assert.equal(JSON.stringify(api.owneditem.getAll()), first);
		assert.equal(api.owneditem.get(29).activated, 0);
		assert.equal(api.owneditem.get(29).materials, 101);
		assert.equal(api.owneditem.get(120).copies.length, 6);
		assert.ok(api.owneditem.get(120).copies.every((c) => c.refinement === 1));
		api.owneditem.activate(29, 100);
		assert.equal(api.owneditem.get(29).activated, 100);
		assert.equal(api.owneditem.get(29).materials, 1);
		api.owneditem.put({ itemID: 29 });
		assert.equal(api.owneditem.get(29).activated, 100);
		assert.equal(api.owneditem.get(29).materials, 2);
		assert.throws(() => api.owneditem.activate(29, 3));
		assert.throws(() => api.owneditem.activate(29, -1));
	});
	await t.test(
		'weapon refinement removes only selected donor, preserves target and prevents reuse',
		() => {
			const [target, donor, other] = api.owneditem.get(120).copies;
			api.owneditem.lock(120, donor.id);
			assert.throws(() => api.owneditem.refine(120, target.id, donor.id), /Unlock/);
			api.owneditem.lock(120, donor.id);
			api.owneditem.equip(29, 120, donor.id);
			assert.throws(() => api.owneditem.refine(120, target.id, donor.id), /Unequip/);
			api.owneditem.setBuild(29, {});
			api.owneditem.refine(120, target.id, donor.id);
			const saved = api.owneditem.get(120);
			assert.equal(saved.copies.length, 5);
			assert.equal(saved.copies.find((c) => c.id === target.id).refinement, 2);
			assert.ok(saved.copies.some((c) => c.id === other.id));
			assert.throws(() => api.owneditem.refine(120, target.id, donor.id));
			assert.throws(() => api.owneditem.refine(120, target.id, target.id));
			api.owneditem.put({ itemID: 120 });
			assert.equal(api.owneditem.get(120).copies.at(-1).refinement, 1);
		}
	);
	await t.test('R100 conserves acquired copies and has no rank-five cap', () => {
		let r = api.normalizeRecord({ wish: 100, manual: 0 }, 13501, 'weapon');
		const id = r.copies[0].id;
		for (const donor of r.copies.slice(1)) r = api.refine(r, id, donor.id);
		assert.equal(r.copies.length, 1);
		assert.equal(r.copies[0].refinement, 100);
		assert.equal(r.consumed.length, 99);
		assert.equal(api.refinementValues(combat.weapons['staff-of-homa'], 100)[0], '515%');
		assert.match(api.refinementDescription(combat.weapons['staff-of-homa'], 100), /515%/);
		const favonius = api.refinementValues(combat.weapons['favonius-greatsword'], 100);
		assert.equal(favonius[0], '100%');
		assert.equal(favonius[1], '0.1');
	});
	await t.test(
		'specific weapon equipment enforces classes, transfers ownership, and preserves copy rank',
		() => {
			api.owneditem.put({ itemID: 6 });
			api.owneditem.put({ itemID: 12 });
			api.owneditem.put({ itemID: 82 });
			const homa = api.owneditem.get(120).copies[0];
			const sword = api.owneditem.get(82).copies[0];
			assert.throws(() => api.owneditem.equip(29, 82, sword.id), /class/);
			assert.throws(() => api.owneditem.equip(12, 120, homa.id), /class/);
			api.owneditem.equip(29, 120, homa.id);
			assert.equal(api.owneditem.getAll()[29].build.weaponCopyID, homa.id);
			api.owneditem.equip(6, 120, homa.id);
			assert.equal(api.owneditem.getAll()[6].build.weaponCopyID, homa.id);
			assert.equal(api.owneditem.getAll()[29].build.weaponCopyID, '');
			assert.equal(api.owneditem.get(120).copies[0].refinement, homa.refinement);
			assert.throws(
				() => api.owneditem.refine(120, api.owneditem.get(120).copies[1].id, homa.id),
				/Unequip/
			);
		}
	);
	await t.test('real Homa passive and Hu Tao skill state use HP conversion and skill cap', () => {
		const character = combat.characters['hu-tao'],
			weapon = combat.weapons['staff-of-homa'];
		const modifiers = api.effectModifiers(api.refinementDescription(weapon, 1));
		const build = { level: 90, weaponLevel: 90, skillLevel: 10, skillActive: true, lowHP: true };
		const stats = api.characterStats(character, weapon, build, modifiers);
		const bare = api.characterStats(character, weapon, build, []);
		assert.ok(Math.abs(stats.hp - bare.hp * 1.2) < 1e-6);
		assert.ok(Math.abs(stats.attack - bare.attack - stats.hp * 0.018) < 1e-6);
		const infused = api.applyTalentState(character, stats, build, 0);
		assert.ok(
			Math.abs(infused.attack - stats.attack - Math.min(stats.hp * 0.06256, stats.baseAttack * 4)) <
				1e-6
		);
		assert.equal(infused.infused, true);
		assert.equal(api.constellationHits(combat.characters.skirk, 1)[0].parameters.param1[0], 5);
		assert.equal(api.constellationHits(combat.characters.skirk, 7)[0].parameters.param1[0], 10);
		const kokomi = api.characterStats(combat.characters['sangonomiya-kokomi'], null, { level: 90 });
		assert.equal(kokomi.critRate, -0.95);
		assert.equal(kokomi.healing, 0.25);
	});
	await t.test('shared ID repair uses named evidence and preserves unattributed counts', () => {
		const data = { ownedItem: { 14523: { manual: 3, wish: 5 } } };
		const histories = [
			{ id: 1, itemID: 14523, name: 'disaster-and-remorse' },
			{ id: 2, itemID: 14523, name: 'angelos-heptades' }
		];
		const repaired = api.repairInventory(data, histories);
		assert.equal(repaired.data.ownedItem[90014523].wish, 1);
		assert.equal(repaired.data.ownedItem[14523].wish, 4);
		assert.equal(repaired.data.ownedItem[14523].manual, 3);
		assert.equal(repaired.histories[0].itemID, 90014523);
		assert.equal(data.ownedItem[14523].wish, 5);
		assert.deepEqual(api.repairInventory(repaired.data, repaired.histories), repaired);
	});
	await t.test(
		'restore preserves activated ranks, copy IDs, locks, consumed donors and build',
		async () => {
			const before = await api.snapshot();
			const saved = JSON.parse(before);
			await api.restoreBackup(before);
			assert.deepEqual(JSON.parse(await api.snapshot()), saved);
		}
	);
	await t.test('merge never resurrects consumed copies', () => {
		const old = api.normalizeRecord({ wish: 3, manual: 0 }, 13501, 'weapon');
		const newer = api.refine(old, old.copies[0].id, old.copies[1].id);
		assert.deepEqual(api.mergeRecord(newer, old), newer);
		assert.deepEqual(api.mergeRecord(old, newer), newer);
	});
	await t.test('real level-90 stats and source coefficients reproduce hand calculations', () => {
		const hutao = combat.characters['hu-tao'];
		const homa = combat.weapons['staff-of-homa'];
		const s = api.characterStats(hutao, homa, { level: 90, weaponLevel: 90 });
		assert.ok(Math.abs(s.hp - 15552.3066196) < 0.001);
		assert.ok(Math.abs(s.critDamage - (0.884 + 0.661536)) < 0.001);
		const stats = {
			attack: 1000,
			hp: 30000,
			defense: 1000,
			em: 0,
			critRate: 0.5,
			critDamage: 1,
			damageBonus: 0
		};
		const build = { level: 90, enemyLevel: 90, resistance: 10 };
		const atk = api.evaluateTalentRow(
			{ name: 'Skill DMG', template: '{param1:P}', parameters: { param1: [2] }, level: 1 },
			stats,
			build
		)[0];
		assert.equal(atk.normal, 900);
		assert.equal(atk.critical, 1800);
		assert.equal(atk.average, 1350);
		const hp = api.evaluateTalentRow(
			{
				name: 'Charged Attack: Equitable Judgment',
				template: '{param1:P} Max HP',
				parameters: { param1: [0.1] },
				level: 1
			},
			stats,
			build
		)[0];
		assert.equal(hp.normal, 1350);
		assert.equal(api.resistanceMultiplier(-0.2), 1.1);
		assert.equal(api.resistanceMultiplier(0.8), 1 / 4.2);
	});
	await t.test(
		'activated constellations boost correct talent and overflow continues its coefficient curve',
		() => {
			const c = combat.characters['hu-tao'];
			assert.equal(api.talentLevel(c, 0, 'combat2', 10), 10);
			assert.equal(api.talentLevel(c, 3, 'combat2', 10), 13);
			assert.equal(api.talentLevel(c, 9, 'combat2', 10), 16);
			assert.equal(api.slotStrength(100, 1), 17);
			assert.equal(api.slotStrength(100, 6), 16);
			assert.equal(api.parameter([1, 2, 3], 5), 5);
		}
	);
});

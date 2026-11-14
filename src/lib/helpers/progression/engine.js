// Acquisition totals are kept for history and milestones. Upgrades spend separate resources.
// Keep local IDs separate from game IDs: 13517 is already used by another
// upstream simulator weapon. The verified game ID lives in combat coverage.
export const REPAIRED_WEAPON_ID = 90014523;
export const count = (record = {}) => (record.manual || 0) + (record.wish || 0);
export function normalizeRecord(record = {}, itemID, type = 'character') {
	const total = count(record);
	if (!Number.isSafeInteger(total) || total < 0) throw Error('Invalid inventory quantity');
	if (record.progressionVersion === 2) return structuredClone(record);
	return {
		...record,
		progressionVersion: 2,
		activated: 0,
		...(type === 'weapon'
			? {
					copies: Array.from({ length: total }, (_, i) => ({
						id: `${itemID}:legacy:${i + 1}`,
						refinement: 1,
						locked: false
					})),
					consumed: []
			  }
			: {})
	};
}
export function materials(record = {}) {
	return Math.max(0, count(record) - 1 - (record.activated || 0));
}
export function activate(record, amount = 1) {
	if (!Number.isSafeInteger(amount) || amount < 1 || materials(record) < amount)
		throw Error('Not enough constellation material');
	if (!Number.isSafeInteger(record.activated + amount))
		throw Error('Constellation exceeds supported integer precision');
	return { ...record, activated: record.activated + amount };
}
export function refine(record, targetID, donorID) {
	if (targetID === donorID) throw Error('Choose a different weapon copy');
	const target = record.copies.find((c) => c.id === targetID);
	const donor = record.copies.find((c) => c.id === donorID);
	if (!target || !donor) throw Error('This weapon copy is no longer available');
	if (donor.locked) throw Error('Unlock the material copy first');
	const refinement = target.refinement + donor.refinement;
	if (!Number.isSafeInteger(refinement))
		throw Error('Refinement exceeds supported integer precision');
	return {
		...record,
		consumed: [...(record.consumed || []), donorID],
		copies: record.copies
			.filter((c) => c.id !== donorID)
			.map((c) => (c.id === targetID ? { ...c, refinement } : c))
	};
}
export function repairInventory(data, histories = []) {
	const repaired = structuredClone(data);
	if (repaired.inventoryIdentityVersion === 1) return { data: repaired, histories };
	const owned = repaired.ownedItem || {};
	const legacy = owned[14523];
	const named = histories.filter((h) => h.itemID === 14523 && h.name === 'disaster-and-remorse');
	if (legacy && named.length) {
		const moved = Math.min(legacy.wish || 0, named.length);
		const destination = owned[REPAIRED_WEAPON_ID] || { manual: 0, wish: 0 };
		owned[REPAIRED_WEAPON_ID] = { ...destination, wish: (destination.wish || 0) + moved };
		owned[14523] = { ...legacy, wish: (legacy.wish || 0) - moved };
	}
	repaired.inventoryIdentityVersion = 1;
	repaired.inventoryMigration = {
		date: new Date().toISOString(),
		legacyOwnedItem: structuredClone(data.ownedItem || {}),
		note: 'Old upgrades were display-only. Duplicates are unspent. Unattributed shared-ID copies remain with Angelos Heptades.',
		ambiguousCopies: legacy
			? Math.max(0, count(legacy) - histories.filter((h) => h.itemID === 14523).length)
			: 0
	};
	repaired.ownedItem = owned;
	return {
		data: repaired,
		histories: histories.map((h) =>
			h.itemID === 14523 && h.name === 'disaster-and-remorse'
				? { ...h, itemID: REPAIRED_WEAPON_ID }
				: h
		)
	};
}

export function mergeRecord(current, incoming) {
	const consumed = [...new Set([...(current.consumed || []), ...(incoming.consumed || [])])];
	const copies = new Map();
	for (const c of [...(current.copies || []), ...(incoming.copies || [])]) {
		const old = copies.get(c.id);
		copies.set(
			c.id,
			old
				? {
						...c,
						refinement: Math.max(old.refinement, c.refinement),
						locked: old.locked || c.locked
				  }
				: c
		);
	}
	const manual = Math.max(current.manual || 0, incoming.manual || 0);
	const wish = Math.max(current.wish || 0, incoming.wish || 0);
	const result = {
		...current,
		manual,
		wish,
		activated: Math.max(current.activated || 0, incoming.activated || 0)
	};
	if (current.copies || incoming.copies) {
		result.copies = [...copies.values()].filter((c) => !consumed.includes(c.id));
		result.consumed = consumed;
		// Only a complete compatible lineage can be merged without manufacturing material.
		const mass = result.copies.reduce((sum, c) => sum + c.refinement, 0);
		if (mass !== manual + wish)
			throw Error(
				'These weapon inventories have incompatible copy histories. Restore the backup instead of merging it.'
			);
	}
	return result;
}

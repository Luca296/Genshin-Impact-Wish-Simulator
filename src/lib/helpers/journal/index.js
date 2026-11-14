import characters from '$lib/data/characters.json';
import weapons from '$lib/data/weapons.json';
import { storageLocal } from '../dataAPI/api-localstore';
import { HistoryManager } from '../dataAPI/api-indexeddb';
import { catalogOf, emptyStats, ingest, evaluate } from './engine';
import { writable } from 'svelte/store';
export const catalog = catalogOf(characters.data, weapons.data);
export const journalNotice = writable(null);

function commit(saved, stats, notify = false) {
	const result = evaluate(catalog, storageLocal.get('ownedItem'), stats, saved.earned);
	const fresh = result.achievements.filter((x) => x.earned && !saved.earned?.[x.id]);
	storageLocal.set('journal', { ...saved, version: 1, stats, earned: result.earned });
	if (notify && fresh.length)
		journalNotice.set({
			title: fresh[0].title,
			count: fresh.length,
			points: fresh.reduce((n, x) => n + x.points, 0)
		});
	return { ...result, title: saved.title || 'traveler' };
}
export async function loadJournal() {
	const saved = storageLocal.get('journal');
	const pending = await HistoryManager.getHistoriesAfter(saved.lastHistoryID || 0);
	const stats = ingest(saved.stats || emptyStats(), pending);
	return commit(
		{
			...saved,
			lastHistoryID: pending.reduce((n, r) => Math.max(n, r.id || 0), saved.lastHistoryID || 0)
		},
		stats
	);
}
export function recordJournalBatch(records) {
	const saved = storageLocal.get('journal');
	const fresh = records.filter((r) => (r.journalHistoryID || 0) > (saved.lastHistoryID || 0));
	return commit(
		{
			...saved,
			lastHistoryID: fresh.reduce(
				(n, r) => Math.max(n, r.journalHistoryID || 0),
				saved.lastHistoryID || 0
			)
		},
		ingest(saved.stats || emptyStats(), fresh),
		true
	);
}
export function equipTitle(id) {
	const saved = storageLocal.get('journal');
	const result = evaluate(catalog, storageLocal.get('ownedItem'), saved.stats, saved.earned);
	if (!result.titles.some((t) => t.id === id && t.unlocked)) return;
	storageLocal.set('journal', { ...saved, title: id });
}

const eventFiles = import.meta.glob('../../data/banners/events/*.json', { eager: true });
export function sourcesFor(item) {
	const found = [];
	for (const [file, module] of Object.entries(eventFiles))
		for (const phase of module.default?.data || module.data || []) {
			const b = phase.banners;
			const event = item.type === 'character' ? b.events : b.weapons;
			if (
				event &&
				(event.featured?.some((x) => (x.character || x.name) === item.name) ||
					event.rateup?.includes(item.name))
			)
				found.push({ patch: file.split('/').pop().replace('.json', ''), phase: phase.phase });
		}
	return found.sort((a, b) => parseFloat(b.patch) - parseFloat(a.patch) || b.phase - a.phase);
}

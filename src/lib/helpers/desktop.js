import { BannerManager, HistoryManager } from './dataAPI/api-indexeddb';
import { storageLocal } from './dataAPI/api-localstore';
import { repairInventory } from './progression/engine';
import { initializeProgression } from './progression/migration';

// Matches upstream JSON .bin backups. Access keys are deliberately excluded.
export async function snapshot() {
	const settings = storageLocal.getData();
	settings.data.export ||= { id: 'GI-Offline' };
	return JSON.stringify({
		settings,
		banners: await BannerManager.getAll(),
		histories: await HistoryManager.getAllHistories()
	});
}
export function validateBackup(text) {
	const value = JSON.parse(text);
	if (
		!value?.settings?.data ||
		typeof value.settings.data !== 'object' ||
		!Array.isArray(value.banners) ||
		!Array.isArray(value.histories)
	)
		throw Error('Unsupported simulator backup');
	if (
		value.banners.some((b) => !Number.isFinite(b.itemID)) ||
		value.histories.some((h) => typeof h.banner !== 'string' || !Number.isFinite(h.itemID))
	)
		throw Error('Invalid backup records');
	return value;
}
let restoring = false,
	timer,
	running;
export async function restoreBackup(text) {
	const value = validateBackup(text);
	const repaired = repairInventory(value.settings.data, value.histories);
	value.settings.data = repaired.data;
	value.histories = repaired.histories;
	// One transaction replaces both stores; storage is updated only after commit.
	await flush();
	restoring = true;
	try {
		const db = await new Promise((resolve, reject) => {
			const r = indexedDB.open('WishSimulator', 3);
			r.onsuccess = () => resolve(r.result);
			r.onerror = () => reject(r.error);
		});
		await new Promise((resolve, reject) => {
			const tx = db.transaction(['history', 'custombanner'], 'readwrite');
			tx.objectStore('history').clear();
			tx.objectStore('custombanner').clear();
			for (const record of value.histories) tx.objectStore('history').put(record);
			for (const record of value.banners) tx.objectStore('custombanner').put(record);
			tx.oncomplete = resolve;
			tx.onerror = () => reject(tx.error);
			tx.onabort = () => reject(tx.error);
		});
		db.close();
		localStorage.setItem('WishSimulator.App', JSON.stringify(value.settings));
		await initializeProgression();
	} finally {
		restoring = false;
	}
}
export async function flush() {
	clearTimeout(timer);
	if (!window.desktop || restoring) return;
	if (running) await running;
	running = snapshot().then((text) => window.desktop.backup(text));
	try {
		return await running;
	} finally {
		running = null;
	}
}
export async function initializeDesktop() {
	if (!window.desktop) return;
	window.offlineGame = { snapshot, restoreBackup, flush };
	document.addEventListener('storageUpdate', () => {
		if (!restoring) {
			clearTimeout(timer);
			timer = setTimeout(() => flush().catch(console.error), 2500);
		}
	});
	window.desktop.onCommand(async (command) => {
		try {
			if (command === 'export') return await window.desktop.export(await snapshot());
			let text;
			if (command === 'import') text = await window.desktop.import();
			if (command === 'restore') {
				const list = await window.desktop.list();
				if (!list.length) return alert('No automatic backups yet.');
				const choice = prompt(
					'Automatic backups, newest first. Enter the number to restore:\n' +
						list.map((n, i) => `${i + 1}. ${n}`).join('\n'),
					'1'
				);
				if (!choice) return;
				const name = list[Number(choice) - 1];
				if (!name) throw Error('Invalid backup number');
				text = await window.desktop.restore(name);
			}
			if (
				text &&
				confirm('Restore this backup? Your current progress will first be backed up automatically.')
			) {
				await restoreBackup(text);
				location.reload();
			}
		} catch (error) {
			alert(error.message);
		}
	});
	window.desktop.ready();
	timer = setTimeout(() => flush().catch(console.error), 2500);
	setInterval(() => flush().catch(console.error), 60000);
}

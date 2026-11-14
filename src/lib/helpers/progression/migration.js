import { storageLocal, owneditem } from '../dataAPI/api-localstore';
import { HistoryManager } from '../dataAPI/api-indexeddb';
import { repairInventory } from './engine';
export async function initializeProgression() {
	const { data = {} } = storageLocal.getData();
	if (data.inventoryIdentityVersion !== 1) {
		const histories = await HistoryManager.getAllHistories();
		const repaired = repairInventory(data, histories);
		for (let i = 0; i < histories.length; i++) {
			if (repaired.histories[i].itemID !== histories[i].itemID)
				await HistoryManager.addHistory(repaired.histories[i]);
		}
		localStorage.setItem('WishSimulator.App', JSON.stringify({ data: repaired.data }));
	}
	owneditem.getAll();
}

import { API_HOST } from '$lib/env';
import { BannerManager } from './dataAPI/api-indexeddb';
import { initCDNURL } from './assets';

const idb = BannerManager;
export const maintenance = false;

export const localBanner = {
	isComplete: async (itemID) => {
		const { character, images, rateup = [], bannerName } = (await idb.get(itemID)) || {};
		const { artURL } = images || {};
		const complete = !!artURL && !!character && rateup.length > 0 && !!bannerName;
		return complete;
	},

	isHostedBanner: async (itemID) => {
		const data = await idb.get(itemID);
		return 'hostedImages' in data;
	},

	renewImage: async ({ id = 0, newData = {}, key = '' }) => {
		const { data = {} } = newData;
		const { url: imageURL, delete_url } = data;
		const [, , , imgID, hash] = delete_url.split('/');
		const idbData = await idb.get(id);

		// create placeholder
		const { hostedImages = {}, imageHash = {}, imgChanged = {} } = idbData;
		const hashList = Object.keys(imageHash).map((k) => imageHash[k].id);
		idbData.hostedImages = hostedImages;
		idbData.imageHash = imageHash;
		idbData.imgChanged = imgChanged;

		const dontRemoveImage = hashList.filter((id) => id === imageHash[key]?.id).length > 1;
		if (!dontRemoveImage) {
			await onlineBanner.deleteImage(imageHash[key] || {});
		}

		// Set new values
		idbData.hostedImages[key] = imageURL;
		idbData.imageHash[key] = { id: imgID, hash };
		idbData.imgChanged[key] = false;
		return idb.put(idbData);
	}
};

export const onlineBanner = {async getData(){return {success:false,message:'Offline'}},async deleteBanner(itemID){await idb.delete(itemID);return {status:'ok'}},async deleteImage(){return false}};
export const syncCustomBanner=async()=>{};

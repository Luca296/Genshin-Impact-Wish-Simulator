import { probabilityRates } from '$lib/data/wish-setup.json';
import { storageLocal } from '../dataAPI/api-localstore';
export function wishMode(version, banner) {
	if (/custom|local/i.test(String(version))) return 'sandbox';
	const defaults = probabilityRates[banner] || probabilityRates['character-event'];
	const overrides = storageLocal.get('probabilityRates')[banner] || {};
	return Object.entries(overrides).some(([key, value]) => String(value) !== String(defaults[key]))
		? 'sandbox'
		: 'normal';
}

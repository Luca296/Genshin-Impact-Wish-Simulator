<script>
	import { getContext, onDestroy, onMount, setContext } from 'svelte';
	import { fade } from 'svelte/transition';
	import { t } from 'svelte-i18n';
	import hotkeys from 'hotkeys-js';

	import { assets } from '$lib/store/app-stores';
	import { HistoryManager } from '$lib/helpers/dataAPI/api-indexeddb';
	import { playSfx } from '$lib/helpers/audio/audio';

	// Component
	import ScreenshotShare from '../_index/ScreenshotShare.svelte';
	import OutfitToggle from './_outfit-toggle.svelte';
	import SplashArt from '../_custom-banner/SplashArtEditor/SplashArt.svelte';
	import ProgressionPanel from './ProgressionPanel.svelte';
	import { owneditem } from '$lib/helpers/dataAPI/api-localstore';

	export let itemID;
	export let useOutfit = false;
	export let outfitName = '';
	export let custom = false;
	export let rarity = 3;
	export let type = 'character';
	export let name = '';
	export let localName = '';
	export let vision = '';
	export let weaponType = '';
	export let qty = 0;
	export let isOwned = true;
	export let images = {};
	export let offset = {};
	export let copyID;
	let view = 'stats';

	let hideInfo = false;
	setContext('toggleInfoHide', () => {
		hideInfo = !hideInfo;
		playSfx();
	});

	const previewOutfit = (outfit, position) => {
		outfitName = outfit;
		offset = position;
		useOutfit = outfit !== 'default';
	};
	setContext('previewOutfit', previewOutfit);

	let onshot = false;
	const closeDetail = getContext('closeDetail');
	setContext('preview', (val) => (onshot = val));

	const getQtyInfo = (type) => {
		const current = owneditem.get(itemID);
		if (type === 'character')
			return `C${current.activated || 0} · ${current.materials || 0} Stela Fortuna`;
		return `R${current.copies?.find((c) => c.id === copyID)?.refinement || 1}`;
	};

	const getArtURL = (outfitName) => {
		if (custom) return images?.artURL;
		if (type === 'weapon') return $assets[name];

		const useOutfit = outfitName && outfitName !== 'default';
		const artKey = useOutfit ? outfitName : name;
		return $assets[`splash-art/${artKey}`];
	};

	let time = '';
	onMount(async () => {
		const idbData = await HistoryManager.getByID(itemID);
		({ time = 'UnTracked' } = idbData[0] || {});
	});

	// Shortcut
	hotkeys('esc', 'itemdetail', (e) => {
		e.preventDefault();
		closeDetail();
	});
	hotkeys.setScope('itemdetail');
	onDestroy(() => hotkeys.deleteScope('itemdetail', 'inventory'));
</script>

{#if view === 'stats'}
	<ProgressionPanel
		{images}
		{useOutfit}
		{outfitName}
		{itemID}
		{copyID}
		{name}
		{localName}
		{type}
		{vision}
		{rarity}
		{custom}
		on:select
		on:close={closeDetail}
		on:art={() => (view = 'art')}
	/>
{:else}
	<button class="back-to-stats" on:click={() => (view = 'stats')}>Attributes & upgrades</button>
	<SplashArt
		character={name}
		artURL={getArtURL(outfitName)}
		position={offset}
		preview
		isCustom={custom}
		{weaponType}
		{localName}
		{vision}
		{onshot}
		{isOwned}
		{rarity}
		{hideInfo}
		on:close={closeDetail}
	/>

	{#if !hideInfo}
		<div transition:fade={{ duration: 250 }} class="handler-container">
			<div class="wrapper">
				{#if type === 'character'}
					<OutfitToggle charName={name} />
				{/if}

				{#if qty > 0}
					<div class="detail">
						<span class="qty"> {getQtyInfo(type)} </span>
						<small> {$t('inventory.firstSummon', { values: { date: time } })} </small>
					</div>
				{/if}

				{#if qty > 0}
					<div class="share">
						<ScreenshotShare />
					</div>
				{/if}
			</div>
		</div>
	{/if}
{/if}

<style>
	.back-to-stats {
		position: fixed;
		left: 5%;
		top: 5%;
		z-index: 30;
		padding: 12px 20px;
		border: 1px solid #e5d1a2;
		border-radius: 6px;
		color: #fff1cc;
		background: #203348;
		cursor: pointer;
	}
	.handler-container {
		width: 100%;
		height: 100%;
		position: fixed;
		top: 0;
		left: 0;
		z-index: +15;
		pointer-events: none;
	}

	.wrapper {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		position: relative;
	}

	.wrapper > :global(div),
	.wrapper :global(button) {
		pointer-events: initial;
	}

	.share {
		display: flex;
		width: 100%;
		text-align: right;
		justify-content: flex-end;
		align-items: center;
		position: absolute;
		bottom: 5%;
		right: 8%;
		color: #fff;
		font-size: 0.8rem;
		z-index: 999;
	}

	.detail {
		position: absolute;
		left: 5%;
		bottom: 2%;
		display: block;
		color: #fff;
		font-size: large;
		-webkit-text-stroke: #000 0.015rem;
		filter: drop-shadow(0 0 0.5rem rgba(0, 0, 0, 0.5)) drop-shadow(0 0 1rem rgba(0, 0, 0, 1));
	}
	.detail span,
	.detail small {
		display: block;
		white-space: nowrap;
	}

	.detail .qty {
		font-size: larger;
	}

	@media screen and (max-width: 520px) {
		.detail {
			font-size: 120%;
		}
	}
</style>

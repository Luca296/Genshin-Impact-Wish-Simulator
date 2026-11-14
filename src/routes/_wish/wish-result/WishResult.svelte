<script>
	import { getContext, onMount, onDestroy, setContext } from 'svelte';
	import { fade } from 'svelte/transition';
	import { t, locale } from 'svelte-i18n';
	import hotkeys from 'hotkeys-js';

	import { assets, customData, viewportHeight, viewportWidth } from '$lib/store/app-stores';
	import { localConfig } from '$lib/helpers/dataAPI/api-localstore';
	import { playSfx, pauseSfx as stopSfx, revealAudio } from '$lib/helpers/audio/audio';
	import { setActiveOutfit } from '$lib/helpers/outfit';
	import { createLink } from '$lib/helpers/shareable-link';

	// Component
	import ResultList from './ResultList.svelte';
	import SplashLight from './_splash-light.svelte';
	import ItemInfo from './_item-info.svelte';
	import WeaponBonus from './_weapon-bonus.svelte';
	import ScreenshotShare from '../../_index/ScreenshotShare.svelte';
	import SplashArt from './_splash-art.svelte';
	import ElementReveal from './ElementReveal.svelte';
	import { createRevealTimeline, isElementalCharacter } from '$lib/helpers/elemental-reveal';

	export let list = [];
	export let skip = false;
	export let standalone = false;
	export let isOutfit = false;

	let preview = standalone || false;
	setContext('preview', (val) => (preview = val));

	const lc = $locale?.toLowerCase() || '';
	const isYuanshen = lc.match(/(cn|ja)/);

	const splashBG = isOutfit ? $assets['outfit-background.webp'] : $assets['splash-background.webp'];
	list = list.map(setActiveOutfit);

	let clientHeight = 0;
	let clientWidth = 0;
	const calculateWrapperHeight = (vw, vh) => {
		if (vw < vh) return '80vw';
		if (vw < vh * 1.5) return '65vw';
		return '100%';
	};
	$: wrapperHeight = calculateWrapperHeight($viewportWidth, $viewportHeight);

	let isSplashOut = false;
	let timer;
	const startTimer = () => {
		clearTimeout(timer);
		isSplashOut = false;
		timer = setTimeout(() => {
			isSplashOut = true;
			clearTimeout(timer);
		}, 1100);
	};

	let showResultList = false;
	let activeIndex = 0;
	let elementStage = 'none';
	let timeline;
	$: elemental = !standalone && !isOutfit && isElementalCharacter(list[activeIndex]);
	$: introPending = elemental && elementStage !== 'revealed' && !showResultList;

	const cancelReveal = (keepBed = false) => {
		timeline?.cancel();
		clearTimeout(timer);
		revealAudio.cancel({ keepBed });
		[3, 4, 5].forEach(star => stopSfx(`reveal${star}Star`));
	};
	const playRevealAudio = () => {
		const item = list[activeIndex];
		cancelReveal(!standalone && !isOutfit && isElementalCharacter(item));
		elementStage = 'none';
		if (!standalone && !isOutfit && isElementalCharacter(item)) {
			revealAudio.startBed();
			const src = item.custom ? $customData?.images?.artURL : $assets[`splash-art/${item.useOutfit ? item.outfitName : item.name}`];
			// Decode into the image cache during suspense without mounting artwork.
			if (src) { const image = new Image(); image.src = src; image.decode?.().catch(() => {}); }
			if (skip || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
				elementStage = 'revealed';
				revealAudio.cue(true);
				return;
			}
			timeline = createRevealTimeline({
				onPhase: phase => { elementStage = phase; },
				onCue: immediate => revealAudio.cue(immediate)
			});
			timeline.start();
			return;
		}
		startTimer();
		if (!standalone) playSfx(`reveal${item.rarity}Star`);
	};
	const finishElementReveal = () => timeline?.finish();

	const createShareableLink = (activeIndex, showResultList) => {
		const isMulti = showResultList && list.length > 1;
		const link = isMulti ? createLink(list) : createLink([list[activeIndex]]);
		return link;
	};

	const showItem = (startIndex) => {
		if (startIndex !== 'start' && introPending) { finishElementReveal(); return; }
		// Single Pull
		if (list.length === 1) {
			if (startIndex === 'start') playRevealAudio();
			return;
		}

		// Multi Pull
		if (activeIndex > list.length - 2) {
			cancelReveal();
			showResultList = true;
			return;
		}
		if (startIndex !== 'start') {
			activeIndex = activeIndex + 1;
		}
		playRevealAudio();
	};

	const closeResult = getContext('closeResult');
	const closeHandle = () => {
		cancelReveal();
		playSfx('close');
		closeResult();
		return;
	};

	const skipHandle = () => {
		cancelReveal();
		playSfx();
		showResultList = true;
	};

	onMount(() => {
		if ((skip || standalone) && list.length > 1) { showResultList = true; return; }
		showItem('start');
	});

	// Shortcut
	const onWish = getContext('onWish');
	const advanceKey = (e) => {
		if (!$onWish) return;
		e.preventDefault();
		if (introPending || (list.length > 1 && !showResultList)) showItem();
	};

	const escapeKey = (e) => {
		if (!$onWish) return;
		e.preventDefault();
		if (list.length === 1 && introPending) return finishElementReveal();
		if (list.length <= 1 || showResultList) return closeHandle();
		return skipHandle();
	};
	hotkeys('enter,space', 'index', advanceKey);
	hotkeys('esc', 'index', escapeKey);
	onDestroy(() => {
		cancelReveal();
		hotkeys.unbind('enter,space', 'index', advanceKey);
		hotkeys.unbind('esc', 'index', escapeKey);
	});
</script>

<div
	class="wish-result"
	class:preview
	data-reveal-phase={elemental && !showResultList ? elementStage : 'standard'}
	data-result-index={activeIndex}
	style="background-image: url({splashBG});"
	out:fade={{ duration: 250 }}
>
	{#if elemental && !showResultList}{#key activeIndex}<ElementReveal vision={list[activeIndex].vision} phase={elementStage} />{/key}{/if}
	<!-- Preview Only -->
	<div class="uid">WishSimulator.App</div>
	<img
		src={$assets[`genshin-logo${isYuanshen ? '-cn' : ''}.webp`]}
		alt="genshin logo"
		class="logo"
		class:cn={isYuanshen}
	/>
	<!-- End Preview Only -->

	{#if !standalone}
		{#if introPending || (list.length > 1 && !showResultList)}
			<button class="skip" on:click={list.length === 1 ? finishElementReveal : skipHandle}>
				{$t('wish.result.skip')} <i class="gi-caret-up" />
			</button>
		{:else}
			<button class="close" on:click={closeHandle} in:fade={{ delay: elemental ? 0 : 1500 }}>
				<i class="gi-close" />
			</button>
		{/if}
	{/if}

	{#if showResultList && list.length > 1}
		<ResultList {list} {standalone} />
	{:else}
		<div class="touch-box" on:mousedown={showItem} />
		<div
			class="zoomist-container"
			style="height: {wrapperHeight};--width:{clientWidth}px;--height:{clientHeight}px"
			bind:clientHeight
			bind:clientWidth
			in:fade={{ duration: 500, delay: 200 }}
		>
			{#each list as { name, rarity, type, outfitName, vision, weaponType, bonusQty, bonusType, stelaFortuna, useOutfit, offset, custom }, i}
				{#if activeIndex === i && (!elemental || elementStage === 'revealed')}
					<div class="art-wrapper">
						{#if !elemental && !isSplashOut} <SplashLight type="in" {rarity} /> {/if}

						<div class="art-wrapper">
							<SplashArt
								{elemental}
								offset={offset?.splashArt}
								{custom}
								{name}
								{type}
								{outfitName}
								{weaponType}
								{useOutfit}
								{clientHeight}
								{clientWidth}
							/>
						</div>

						<ItemInfo
							{elemental}
							itemName={name}
							{type}
							{outfitName}
							{rarity}
							{vision}
							{bonusQty}
							{weaponType}
							{stelaFortuna}
							{custom}
						/>
						<WeaponBonus {type} {bonusQty} {bonusType} />
						{#if !elemental && isSplashOut} <SplashLight type="out" {rarity} /> {/if}
					</div>
				{/if}
			{/each}
		</div>
	{/if}

	{#if !standalone}
		{#if (!introPending && list[activeIndex].rarity > 3) || (showResultList && list.length > 1)}
			<div class="share">
				<ScreenshotShare canshare shareURL={createShareableLink(activeIndex, showResultList)} />
			</div>
		{/if}
	{/if}
</div>

<style>
	.skip,
	.close {
		position: fixed;
		top: 30px;
		right: 2%;
		z-index: 10;
	}

	:global(.mobile) .close {
		top: 0.3rem;
		right: 6%;
	}

	.skip {
		color: #fff;
		font-size: 1.2rem;
	}

	.gi-caret-up {
		display: inline-block;
		transform: rotate(90deg) translateX(-0.1rem);
		vertical-align: middle;
		margin-left: -0.5em;
	}

	:global(.mobile) .skip {
		font-size: 0.8rem;
		right: 5%;
		top: 0.5rem;
	}

	.wish-result {
		background-size: cover;
		background-position: center;
	}

	.wish-result {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		position: relative;
	}

	.touch-box {
		width: 100%;
		height: 100%;
		position: absolute;
		top: 0;
		left: 0;
		z-index: +5;
	}

	.zoomist-container {
		position:relative;
		z-index:1;
		aspect-ratio: 1/1;
	}
	.art-wrapper {
		width: 100%;
		height: 100%;
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

	button:active {
		transform: scale(0.9);
	}

	:global(.preview) .uid {
		position: fixed;
		left: 1rem;
		bottom: 1rem;
		display: block !important;
		color: #fff;
		text-shadow: 0 0 1.5px rgba(0, 0, 0, 0.7);
	}
	.logo,
	.uid {
		display: none;
		transition: all 0.1.5s;
		z-index: 999;
		pointer-events: none;
	}

	:global(.preview) .logo {
		display: block;
		width: 30vh;
		max-width: 30%;
		position: fixed;
		bottom: 0px;
		right: 2rem;
	}

	.logo.cn {
		max-height: 20vh;
		width: 20vh;
	}
</style>

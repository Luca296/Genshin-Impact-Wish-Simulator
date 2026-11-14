<script>
	import { t } from 'svelte-i18n';
	import { getBannerName, highlightBannerName } from '$lib/helpers/nameText';
	import { getCharDetails } from '$lib/helpers/gacha/itemdrop-base';
	import FitText from '$lib/components/FitText.svelte';
	import layouts from '$lib/data/banner-label-layouts.json';
	export let data;
	export let event2 = false;
	$: weapon = data.type === 'weapon-event';
	$: vision = weapon ? 'epitome' : getCharDetails(data.character).vision;
	$: heading = $t(`banner.${weapon ? 'epitome-invocation' : getBannerName(data.bannerName).name}`);
	$: layout = layouts[data.bannerName];
	const bounds = rect => `left:${rect[0]}%;top:${rect[1]}%;width:${rect[2]}%;height:${rect[3]}%;`;
</script>

<div class="native-labels" class:weapon class:longHeading={data.bannerName === 'to-the-looking-glass-the-mademoiselle-said-1'} data-native-labels={data.bannerName}>
	<div class="heading" style="top:{layout.header.headingTop}%;height:{layout.header.availabilityTop - layout.header.headingTop - 2}%"><FitText maxSize="calc(.043 * var(--content-width))"><h1>{@html highlightBannerName(heading, vision)}</h1></FitText></div>
	<div class="availability" style="top:{layout.header.availabilityTop}%"><FitText maxSize="calc(.024 * var(--content-width))">{$t('wish.banner.newWishAvailable')}</FitText></div>
	<div class="event-tag bg-{vision}" style="top:{layout.header.eventTop}%"><i class="gi-primo-star" /> {weapon ? $t('wish.banner.weaponEventLabel') : $t('wish.banner.character-event')}{!weapon && event2 ? '—2' : ''}</div>
	{#if weapon}
		<div class="weapon-plate plate" style={bounds(layout.caption)}>
			<div class="weapon-names"><FitText maxSize="calc(.027 * var(--content-width))">{#each data.featured as item}<div>{$t(item.name)}</div>{/each}</FitText></div>
			<div class="stars" aria-label="5 stars">{#each Array(5) as _}<i class="gi-star" />{/each}</div>
		</div>
		<div class="rateup-plate plate" style={bounds(layout.rateup)}>
			<div class="rateup-name"><FitText maxSize="calc(.023 * var(--content-width))">{$t(data.rateup[0])}, {$t('wish.banner.etc')}</FitText></div>
			<div class="stars" aria-label="4 stars">{#each Array(4) as _}<i class="gi-star" />{/each}</div>
		</div>
	{:else}
		<div class="character-plate plate" style={bounds(layout.caption)}>
			<span class="up">{$t('wish.banner.up')}</span>
			<div class="character-name"><FitText maxSize="calc(.043 * var(--content-width))">{$t(`${data.character}.name`)}</FitText></div>
			<div class="stars" aria-label="5 stars">{#each Array(5) as _}<i class="gi-star" />{/each}</div>
			<div class="character-title"><FitText maxSize="calc(.021 * var(--content-width))">{$t(`${data.character}.title`)}</FitText></div>
		</div>
	{/if}
</div>

<style>
	.native-labels {position:absolute;inset:0;color:#565654;pointer-events:none;text-align:left}
	.heading {position:absolute;left:4.6%;top:5%;width:36%;height:23%;line-height:1.05}
	.longHeading .heading {width:44%}
	.availability {position:absolute;left:4.6%;top:30%;width:32%;height:7%}
	.event-tag {position:absolute;left:4.8%;top:46.2%;width:max-content;min-width:24%;max-width:35%;min-height:6.5%;padding:.4% .8%;color:white;font-size:calc(.0175 * var(--content-width));line-height:1.15;display:flex;gap:.25em;align-items:center;white-space:nowrap}
	.plate {position:absolute;background:#29292d;color:#fff;padding:.6% 1%;box-shadow:0 2px 10px #10102030}
	/* The opaque nameplates cover the old raster lettering, including its
	   shadows, while the art and promotional badges remain in their positions. */
	.character-plate {display:grid;grid-template-rows:48% 22% 30%;padding:.5% .8%;background:#25252c;box-shadow:none}
	.character-name {min-width:0;min-height:0;padding-right:9%}
	.up {position:absolute;right:2%;top:0;color:#ffe068;font-size:calc(.017 * var(--content-width));text-shadow:0 1px 2px #c18828}
	.character-title {color:#ddc994;min-height:0}
	.stars {display:flex;align-items:center;color:#ffd453;font-size:calc(.021 * var(--content-width));gap:.1em;line-height:1}
	.weapon-plate {left:34%;top:75%;width:32%;height:21%;display:flex;flex-direction:column}
	.weapon-names {height:76%;min-height:0}
	.weapon-plate .stars {height:24%}
	.rateup-plate {left:71%;top:80%;width:24%;height:16%;display:flex;flex-direction:column}
	.rateup-name {height:65%;min-height:0}
	.rateup-plate .stars {height:35%}
	.weapon .event-tag {background:#e89b43}
	.native-labels :global(.epitome-flat) {color:#dd8730}
</style>

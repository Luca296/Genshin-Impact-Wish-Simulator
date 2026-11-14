<script>
	import { getContext, onDestroy } from 'svelte';
	import { journalNotice } from '$lib/helpers/journal';
	const onWish = getContext('onWish');
	const navigate = getContext('navigate');
	let timer;
	let showing = null;
	$: if ($journalNotice && !$onWish) {
		showing = $journalNotice;
		journalNotice.set(null);
		clearTimeout(timer);
		timer = setTimeout(() => (showing = null), 6000);
	}
	onDestroy(() => clearTimeout(timer));
</script>

{#if showing && !$onWish}<button
		class="achievement-notice"
		on:click={() => {
			showing = null;
			navigate('journal');
		}}
		aria-live="polite"
		><i class="gi-star" /><span
			><small>Achievement completed{showing.count > 1 ? ' ×' + showing.count : ''}</small><strong
				>{showing.title}</strong
			></span
		><span class="points">+{showing.points}</span></button
	>{/if}

<style>
	.achievement-notice {
		position: fixed;
		z-index: 110;
		top: 18px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: 18px;
		padding: 14px 24px;
		max-width: 90vw;
		color: #f5e7bf;
		background: #303b4ff5;
		border: 1px solid #c6b384;
		border-radius: 4px;
		box-shadow: 0 5px 20px #0005;
		text-align: left;
	}
	.achievement-notice > i {
		font-size: 1.8rem;
		color: #d5bc83;
	}
	.achievement-notice small {
		display: block;
		color: #d2c7a9;
		font-size: 0.65rem;
		margin-bottom: 5px;
	}
	.achievement-notice strong {
		font-size: 0.9rem;
		font-weight: 400;
	}
	.points {
		color: #d5bc83;
		font-size: 0.85rem;
	}
	.achievement-notice:focus-visible {
		outline: 2px solid white;
		outline-offset: 3px;
	}
</style>

<script>
	import { onMount } from 'svelte';
	export let maxSize = '1rem';
	let box, content;
	onMount(() => {
		let frame, alive = true;
		const fit = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => {
				if (!alive || !box.clientWidth || !box.clientHeight) return;
				content.style.fontSize = maxSize;
				let size = parseFloat(getComputedStyle(content).fontSize);
				for (let i = 0; i < 40 && (content.scrollHeight > content.clientHeight + 1 || content.scrollWidth > content.clientWidth + 1); i++) {
					size *= .95;
					content.style.fontSize = `${size}px`;
				}
			});
		};
		const resize = new ResizeObserver(fit);
		const changes = new MutationObserver(fit);
		resize.observe(box);
		changes.observe(content, { childList: true, subtree: true, characterData: true });
		document.fonts.ready.then(fit);
		fit();
		return () => { alive = false; cancelAnimationFrame(frame); resize.disconnect(); changes.disconnect(); };
	});
</script>

<div class="fit-box" bind:this={box}><div class="fit-text" bind:this={content} style="font-size:{maxSize}"><slot /></div></div>

<style>
	.fit-box,.fit-text {width:100%;height:100%;min-width:0;min-height:0}
	.fit-text {overflow:hidden;line-height:1.08}
	.fit-text :global(h1) {font:inherit;line-height:inherit;margin:0;text-align:inherit}
</style>

<script>
	import SvgIcon from '$lib/components/SVGIcon.svelte';
	import { assets } from '$lib/store/app-stores';
	import { ELEMENT_COLORS } from '$lib/helpers/elemental-reveal';
	export let vision;
	export let phase = 'silhouette';
	$: released = phase === 'wash' || phase === 'revealed';
</script>

<div class="element-reveal" class:complete={phase === 'revealed'} class:released data-phase={phase}
	style="--element-color:{ELEMENT_COLORS[vision]};--element-art:url('{$assets[`element-${vision}-bg.webp`]}');--wish-art:url('{$assets['splash-background.webp']}')" aria-hidden="true">
	<div class="gold-space">
		<div class="old-stars" />
		<div class="mist amber" /><div class="mist pearl" />
		<div class="gathered-light" />
	</div>
	<div class="element-space"><div class="element-art" /><div class="current one" /><div class="current two" /></div>
	<div class="embers">{#each Array(42) as _, i}<i style="--x:{(i * 47 + 13) % 100}%;--y:{(i * 31 + 9) % 100}%;--size:{i % 6 === 0 ? 4 : 2}px;--delay:{-i * .43}s;--duration:{5 + i % 7}s;--travel:{24 + i % 5 * 12}px" />{/each}</div>
	<div class="burst" />
	<div class="vignette" />
	<div class="emblem" class:lit={phase !== 'silhouette' && phase !== 'none'}>
		<div class="symbol black"><SvgIcon name={vision} /></div>
		<div class="symbol colored"><SvgIcon name={vision} /></div>
	</div>
</div>

<style>
	.element-reveal {position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:2;background:#100f1c;isolation:isolate}
	.element-reveal.complete {z-index:0}
	.gold-space,.element-space,.element-art,.old-stars,.vignette {position:absolute;inset:0}
	.gold-space {background:radial-gradient(ellipse at 51% 48%,#c38e4866,transparent 43%),linear-gradient(125deg,#0e1522 5%,#33281f 42%,#15131e 85%);transition:opacity .8s}
	.old-stars {background:var(--wish-art) center/cover;filter:sepia(.9) saturate(.7);opacity:.35;animation:space-drift 24s ease-in-out infinite alternate}
	.mist {position:absolute;inset:-30%;filter:blur(32px);mix-blend-mode:screen;will-change:transform;animation:mist-flow 9s ease-in-out infinite alternate}
	.amber {background:radial-gradient(ellipse at 35% 62%,#e0a14b40,transparent 31%),radial-gradient(ellipse at 63% 39%,#ffd68a59,transparent 29%),radial-gradient(ellipse at 70% 65%,#a96b2f40,transparent 23%);transform:rotate(-24deg)}
	.pearl {background:radial-gradient(ellipse at 40% 47%,#ffedbb4d,transparent 19%),radial-gradient(ellipse at 57% 55%,#e5bd7040,transparent 25%);animation-delay:-4s;animation-duration:7s;scale:1.2 .55}
	.gathered-light {position:absolute;inset:15% 15%;background:radial-gradient(ellipse at 51% 51%,#fff3c9b3, #e9b65d47 24%,transparent 63%);filter:blur(20px);animation:gather .7s ease-in both}
	.element-space {opacity:0;background:#0c1423;transition:opacity .85s ease}
	.element-art {inset:-4%;background:var(--element-art) center/cover;animation:space-drift 18s ease-in-out infinite alternate}
	.current {position:absolute;inset:-35%;mix-blend-mode:screen;filter:blur(30px);opacity:.2;background:radial-gradient(ellipse at 38% 60%,var(--element-color),transparent 30%),radial-gradient(ellipse at 67% 32%,var(--element-color),transparent 24%);animation:mist-flow 12s ease-in-out infinite alternate}
	.current.two {opacity:.13;scale:1.25 .4;rotate:-30deg;animation-delay:-6s;animation-duration:9s}
	.released .element-space {opacity:1}
	.released .gold-space {opacity:0}
	.embers {position:absolute;inset:0;color:#ffe3a1;transition:color .8s;opacity:.8}
	.embers i {position:absolute;left:var(--x);top:var(--y);width:var(--size);height:var(--size);border-radius:1px;background:currentColor;box-shadow:0 0 9px currentColor;animation:drift var(--duration) ease-in-out var(--delay) infinite;will-change:transform}
	.embers i:nth-child(6n) {clip-path:polygon(50% 0,62% 39%,100% 50%,62% 61%,50% 100%,38% 61%,0 50%,38% 39%);width:9px;height:9px}
	.released .embers {color:var(--element-color);opacity:.6}
	.emblem {position:absolute;left:50%;top:50%;width:clamp(150px,31vmin,310px);aspect-ratio:1;transform:translate(-50%,-50%);animation:arrive .6s cubic-bezier(.16,1,.3,1) both;transition:opacity .3s,scale .4s}
	.symbol {position:absolute;inset:0;transition:opacity .5s ease,filter .5s ease}
	.symbol :global(svg) {width:100%;height:100%;overflow:visible}
	.symbol :global(circle),.symbol :global(ellipse) {display:none}
	.black {filter:brightness(0) drop-shadow(0 0 1px #ffe6b1) drop-shadow(0 0 9px #ffcf6c80)}
	.colored {opacity:0;filter:drop-shadow(0 0 5px #fff) drop-shadow(0 0 19px var(--element-color)) drop-shadow(0 0 45px var(--element-color))}
	.lit .black {opacity:0}
	.lit .colored {opacity:1;animation:ignite .65s ease-out both}
	.burst {position:absolute;inset:-75%;opacity:0;background:radial-gradient(ellipse,#fffef5 0%,#ffffffdd 4%,var(--element-color) 13%,transparent 46%);mix-blend-mode:screen;pointer-events:none}
	.released .burst {animation:release 1.15s cubic-bezier(.16,.65,.25,1) both}
	.vignette {background:radial-gradient(ellipse at 53% 47%,transparent 22%,#080d2080 85%,#050912bf);opacity:.7}
	.complete .emblem {opacity:0;scale:1.12;animation:none}
	@keyframes gather {from{opacity:.4;transform:scale(1.35,.85)}to{opacity:1;transform:scale(.95,1)}}
	@keyframes mist-flow {from{translate:-4% 3%;rotate:-9deg}to{translate:5% -4%;rotate:8deg}}
	@keyframes space-drift {from{transform:scale(1.02) translate(-.5%,0)}to{transform:scale(1.07) translate(.5%,-1%)}}
	@keyframes drift {0%{opacity:0;transform:translate3d(-10px,18px,0) rotate(0)}25%,65%{opacity:.75}100%{opacity:0;transform:translate3d(20px,calc(-1 * var(--travel)),0) rotate(85deg)}}
	@keyframes arrive {from{opacity:0;scale:1.15}to{opacity:1;scale:1}}
	@keyframes ignite {0%{scale:1}45%{scale:1.08;filter:brightness(1.7) drop-shadow(0 0 25px var(--element-color))}100%{scale:1}}
	@keyframes release {0%{opacity:0;transform:scale(.12)}30%{opacity:.95}70%{opacity:.25}100%{opacity:0;transform:scale(1.3)}}
	@media(prefers-reduced-motion:reduce) {*,*::before,*::after{animation:none!important;transition:none!important}.complete .element-space{opacity:1}.burst{display:none}}
</style>

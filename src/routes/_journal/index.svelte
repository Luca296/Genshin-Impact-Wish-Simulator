<script>
	import { getContext, onMount } from 'svelte';
	import { t } from 'svelte-i18n';
	import { assets, preloadVersion } from '$lib/store/app-stores';
	import { catalog, loadJournal, equipTitle, sourcesFor } from '$lib/helpers/journal';
	import { displayName } from '$lib/helpers/journal/engine';
	import { storageLocal } from '$lib/helpers/dataAPI/api-localstore';
	import { playSfx } from '$lib/helpers/audio/audio';
	const navigate = getContext('navigate');
	let data,
		error = '',
		tab = 'Achievements',
		category = 'All',
		status = 'All',
		search = '',
		selectedSet = null,
		selectedItem = null,
		titlesOpen = false;
	let owned = {};
	const quantity = (item) =>
		item.type === 'weapon' && owned[item.itemID]?.copies
			? owned[item.itemID].copies.length
			: Number(owned[item.itemID]?.wish || 0) + Number(owned[item.itemID]?.manual || 0);
	const rankLabel = (item) =>
		item.type === 'character'
			? 'C' + (owned[item.itemID]?.activated || 0)
			: 'R' + Math.max(1, ...(owned[item.itemID]?.copies || []).map((c) => c.refinement));
	const name = (item) => $t(item.type + '.' + item.name, { default: displayName(item.name) });
	async function refresh() {
		try {
			data = await loadJournal();
			owned = storageLocal.get('ownedItem');
			error = '';
		} catch (e) {
			error = 'The journal could not be loaded. Please try again.';
			console.error(e);
		}
	}
	onMount(() => {
		refresh();
		document.querySelector('#journal .close')?.focus();
	});
	const close = () => {
		if (selectedItem) {
			selectedItem = null;
			return;
		}
		if (titlesOpen) {
			titlesOpen = false;
			return;
		}
		navigate('index');
		playSfx('close');
	};
	function keydown(e) {
		if (e.key === 'Escape') {
			e.preventDefault();
			close();
		}
	}
	function modalFocus(node) {
		const previous = document.activeElement;
		const focusable = () => [
			...node.querySelectorAll('button:not(:disabled),input,select,[tabindex="0"]')
		];
		focusable()[0]?.focus();
		const trap = (e) => {
			if (e.key !== 'Tab') return;
			const list = focusable(),
				first = list[0],
				last = list[list.length - 1];
			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last?.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first?.focus();
			}
		};
		node.addEventListener('keydown', trap);
		return {
			destroy() {
				node.removeEventListener('keydown', trap);
				previous?.focus();
			}
		};
	}
	function chooseTab(value) {
		tab = value;
		category = 'All';
		status = 'All';
		search = '';
		selectedSet = null;
		playSfx('shopnav');
	}
	$: categories =
		tab === 'Achievements'
			? ['All', 'Journey', 'Companions', 'Armory', 'Collections', 'Fortune', 'Dreams']
			: tab === 'Collections'
			? ['All', 'Regions', 'Elements', 'Weapons', 'Themed']
			: ['All', 'Characters', 'Weapons'];
	$: achievements = data
		? data.achievements
				.filter(
					(a) =>
						(category === 'All' || a.category === category) &&
						(status === 'All' || (status === 'Completed' ? !!a.earned : !a.earned)) &&
						(a.title + ' ' + a.description).toLowerCase().includes(search.toLowerCase())
				)
				.sort(
					(a, b) =>
						Number(!!a.earned) - Number(!!b.earned) || b.current / b.target - a.current / a.target
				)
		: [];
	$: sets = data
		? data.sets.filter(
				(s) =>
					(category === 'All' ||
						s.id.startsWith(
							{ Regions: 'region-', Elements: 'element-', Weapons: 'weapon-', Themed: 'theme-' }[
								category
							]
						)) &&
					s.name.toLowerCase().includes(search.toLowerCase()) &&
					(status === 'All' ||
						(status === 'Completed' ? s.current === s.total : s.current < s.total))
		  )
		: [];
	$: album = catalog
		.filter(
			(i) =>
				(!selectedSet || selectedSet.items.some((x) => x.itemID === i.itemID)) &&
				(category === 'All' || i.type === (category === 'Characters' ? 'character' : 'weapon')) &&
				(status === 'All' || (status === 'Owned' ? quantity(i) > 0 : quantity(i) === 0)) &&
				name(i).toLowerCase().includes(search.toLowerCase())
		)
		.sort((a, b) => b.rarity - a.rarity || name(a).localeCompare(name(b)));
	$: earnedCount = data ? data.achievements.filter((a) => a.earned).length : 0;
	function openSet(s) {
		selectedSet = s;
		tab = 'Album';
		category = 'All';
		status = 'All';
		search = '';
		playSfx('collectionitem');
	}
	function openItem(item) {
		selectedItem = { ...item, sources: sourcesFor(item) };
		playSfx('collectionitem');
	}
	function visit(source) {
		preloadVersion.set(source);
		navigate('index');
		playSfx('prevbanner');
	}
	function setTitle(id) {
		equipTitle(id);
		data = { ...data, title: id };
		titlesOpen = false;
		playSfx();
	}
</script>

<svelte:window on:keydown={keydown} />
<svelte:head><title>Collector's Journal</title></svelte:head>
<section id="journal" style="--journal-bg:url('{$assets['constellation.webp']}')">
	<header>
		<div class="heading">
			<i class="gi-star" aria-hidden="true" />
			<div>
				<h1>Collector's Journal</h1>
				<button class="title-select" on:click={() => (titlesOpen = true)}
					>{data?.titles.find((x) => x.id === data.title)?.name || 'Traveler'}
					<span>◇</span></button
				>
			</div>
		</div>
		<div class="score">
			<i class="gi-star" />
			{data?.points || 0}<small>Achievement points</small>
		</div>
		<button class="close" aria-label="Close journal" on:click={close}><i class="gi-close" /></button
		>
	</header>
	<nav class="tabs" aria-label="Journal pages">
		{#each ['Achievements', 'Collections', 'Album'] as value}<button
				class:active={tab === value}
				aria-pressed={tab === value}
				on:click={() => chooseTab(value)}>{value}</button
			>{/each}<span class="completion"
			>{earnedCount} / {data?.achievements.length || 0} achievements</span
		>
	</nav>
	{#if error}<div class="empty">
			{error}<button class="pill" on:click={refresh}>Try again</button>
		</div>{:else if !data}<div class="empty">Opening the journal…</div>{:else}
		<div class="body">
			<aside aria-label="Journal categories">
				{#each categories as c}<button
						class:active={category === c}
						aria-pressed={category === c}
						on:click={() => {
							category = c;
							playSfx('shopnav');
						}}><span class="diamond" aria-hidden="true">◇</span>{c}</button
					>{/each}
				<div class="aside-note">
					{tab === 'Achievements'
						? 'Every wish leaves a story.'
						: tab === 'Collections'
						? 'Companions gathered. Memories kept.'
						: 'A record of every discovery.'}
				</div>
			</aside>
			<div class="content">
				<div class="tools">
					<input aria-label="Search journal" placeholder="Search" bind:value={search} /><select
						aria-label="Filter progress"
						bind:value={status}
						>{#each tab === 'Album' ? ['All', 'Owned', 'Missing'] : ['All', 'In progress', 'Completed'] as option}<option
								>{option}</option
							>{/each}</select
					>
				</div>
				{#if tab === 'Achievements'}
					<div class="scroll" tabindex="0" aria-label="Achievements">
						<div class="records">
							{#each achievements as a}<article class="achievement" class:earned={a.earned}>
									<div class="medal" class:complete={a.earned}>
										<i
											class="gi-{[
												'anemo',
												'geo',
												'electro',
												'dendro',
												'hydro',
												'pyro',
												'cryo'
											].includes(a.icon)
												? a.icon
												: 'star'}"
										/>
									</div>
									<div class="description">
										<h2>{a.title}</h2>
										<p>{a.description}</p>
										<div class="progress-line">
											<progress
												value={a.earned ? a.target : a.current}
												max={a.target}
												aria-label={a.title}
											/><span
												>{a.earned ? a.target.toLocaleString() : a.current.toLocaleString()} / {a.target.toLocaleString()}</span
											>
										</div>
									</div>
									<div class="award">
										<span><i class="gi-star" /> {a.points}</span><small
											>{a.earned ? 'Completed' : 'In progress'}</small
										>
									</div>
								</article>{/each}{#if !achievements.length}<p class="empty">
									No achievements match these filters.
								</p>{/if}
						</div>
					</div>
				{:else if tab === 'Collections'}
					<div class="scroll" tabindex="0" aria-label="Collection sets">
						<div class="sets">
							{#each sets as s}<button
									class="set"
									class:complete={s.current === s.total}
									on:click={() => openSet(s)}
									><div class="set-heading">
										<i
											class="gi-{[
												'anemo',
												'geo',
												'electro',
												'dendro',
												'hydro',
												'pyro',
												'cryo'
											].includes(s.icon)
												? s.icon
												: 'star'}"
										/><span
											>{s.current === s.total
												? 'Complete'
												: Math.floor((s.current / s.total) * 100) + '%'}</span
										>
									</div>
									<h2>{s.name}</h2>
									<p>{s.description}</p>
									<div class="mini-faces">
										{#each s.items.slice(0, 5) as item}<img
												class:missing={!quantity(item)}
												src={$assets[item.type === 'character' ? 'face/' + item.name : item.name] ||
													$assets['placeholder-face.webp']}
												alt={name(item)}
												loading="lazy"
											/>{/each}
									</div>
									<progress value={s.current} max={s.total} aria-label={s.name} />
									<div class="milestones">
										{#each [25, 50, 75, 100] as n}<span
												class:reached={(s.current / s.total) * 100 >= n}>◆ {n}%</span
											>{/each}
									</div>
									<div class="set-foot">
										{s.current} / {s.total}<span>View collection</span>
									</div></button
								>{/each}{#if !sets.length}<p class="empty">
									No collections match these filters.
								</p>{/if}
						</div>
					</div>
				{:else}
					{#if selectedSet}<div class="set-filter">
							<span>{selectedSet.name} · {selectedSet.current} / {selectedSet.total}</span><button
								on:click={() => (selectedSet = null)}>Show all</button
							>
						</div>{/if}
					<div class="scroll" tabindex="0" aria-label="Collection album">
						<div class="album">
							{#each album as item}<button
									class="item"
									class:missing={!quantity(item)}
									on:click={() => openItem(item)}
									aria-label={name(item) + (quantity(item) ? ', owned' : ', missing')}
									><div
										class="portrait"
										style="background-image:url('{$assets[item.rarity + 'star-bg.webp']}')"
									>
										<img
											src={$assets[item.type === 'character' ? 'face/' + item.name : item.name] ||
												$assets['placeholder-face.webp']}
											alt=""
											loading="lazy"
										/>{#if item.vision}<i
												class="element gi-{item.vision} {item.vision}-flat"
											/>{/if}<span class="copies"
											>{quantity(item) ? rankLabel(item) : 'Missing'}</span
										>
									</div>
									<div class="item-name">
										<span class="stars">{'★'.repeat(item.rarity)}</span><span>{name(item)}</span>
									</div></button
								>{/each}{#if !album.length}<p class="empty">No entries match these filters.</p>{/if}
						</div>
					</div>
				{/if}
				<footer>
					{tab === 'Achievements'
						? 'Fortune achievements use standard odds. Custom wishes have their own Dreams category.'
						: tab === 'Collections'
						? 'Collection milestones count your owned items, including existing progress.'
						: 'Select an entry to see its copies and featured banners.'}
				</footer>
			</div>
		</div>{/if}
</section>
{#if selectedItem}
	<div class="veil">
		<section
			class="dialog"
			use:modalFocus
			role="dialog"
			aria-modal="true"
			aria-label={name(selectedItem)}
		>
			<button class="close" aria-label="Close entry" on:click={() => (selectedItem = null)}
				><i class="gi-close" /></button
			><img
				class="detail-art"
				src={$assets[
					selectedItem.type === 'character' ? 'face/' + selectedItem.name : selectedItem.name
				] || $assets['placeholder-face.webp']}
				alt=""
			/>
			<h2>{name(selectedItem)}</h2>
			<p class="stars">{'★'.repeat(selectedItem.rarity)}</p>
			<p>
				{selectedItem.type === 'character'
					? `${quantity(selectedItem) ? 'Owned' : 'Missing'} · ${rankLabel(
							selectedItem
					  )} · ${Math.max(
							0,
							quantity(selectedItem) - 1 - (owned[selectedItem.itemID]?.activated || 0)
					  )} constellation materials`
					: `${quantity(selectedItem)} copies owned · ${rankLabel(selectedItem)}`}
			</p>
			<h3>Featured banners</h3>
			<div class="sources">
				{#each selectedItem.sources.slice(0, 18) as source}<button
						class="pill"
						on:click={() => visit(source)}>Version {source.patch} · Phase {source.phase}</button
					>{/each}{#if !selectedItem.sources.length}<p>
						{selectedItem.type === 'weapon' && !selectedItem.limited
							? 'Available in standard wish pools.'
							: 'Check the banner archive for standard and chronicled wish pools.'}
					</p>{/if}
			</div>
			<button
				class="pill wide"
				on:click={() => {
					navigate('allbanners');
					playSfx('prevbanner');
				}}>Open banner archive</button
			>
		</section>
	</div>
{/if}
{#if titlesOpen && data}
	<div class="veil">
		<section class="dialog" role="dialog" aria-modal="true" aria-label="Journal titles">
			<button class="close" aria-label="Close titles" on:click={() => (titlesOpen = false)}
				><i class="gi-close" /></button
			>
			<h2>A name among the stars</h2>
			<p>Earn achievement points to unlock journal titles.</p>
			<div class="titles">
				{#each data.titles as title}<button
						class="title-option"
						disabled={!title.unlocked}
						on:click={() => setTitle(title.id)}
						><span>{title.name}</span><small
							>{data.title === title.id
								? 'Equipped'
								: title.unlocked
								? 'Equip'
								: title.threshold + ' points'}</small
						></button
					>{/each}
			</div>
		</section>
	</div>
{/if}

<style>
	#journal {
		position: fixed;
		inset: 0;
		z-index: 12;
		color: #ece5d8;
		background: #263247;
		display: flex;
		flex-direction: column;
		padding: 22px 3% 16px;
		background-image: linear-gradient(110deg, #243045f2, #303e53e8), var(--journal-bg);
		background-size: cover;
		background-position: center;
	}
	header {
		display: flex;
		align-items: center;
		gap: 24px;
		margin-bottom: 20px;
		flex-shrink: 0;
	}
	.heading {
		display: flex;
		align-items: center;
		gap: 16px;
	}
	.heading > i {
		font-size: 2.2rem;
		color: #d2bb87;
	}
	h1 {
		text-align: left;
		color: #ece5d8;
		font-size: 1.45rem;
	}
	.title-select {
		color: #d2bb87;
		font-size: 0.8rem;
		margin-top: 5px;
	}
	.title-select span {
		margin-left: 10px;
	}
	.score {
		margin-left: auto;
		color: #e7cd92;
		font-size: 1.5rem;
		text-align: right;
	}
	.score small {
		display: block;
		color: #c2c5cc;
		font-size: 0.7rem;
		margin-top: 4px;
	}
	.score i {
		font-size: 1.1rem;
	}
	.tabs {
		display: flex;
		align-items: center;
		gap: 8px;
		border-bottom: 1px solid #c6b38455;
		padding-bottom: 12px;
		flex-shrink: 0;
	}
	.tabs button,
	.pill {
		border-radius: 30px;
		padding: 9px 24px;
		color: #ece5d8;
		border: 1px solid #ddd2b044;
	}
	.tabs button.active,
	.pill {
		background: #ece5d8;
		color: #3b4255;
	}
	.tabs button:hover {
		border-color: #fff;
	}
	.completion {
		margin-left: auto;
		font-size: 0.8rem;
		color: #c8c4b9;
	}
	.body {
		display: flex;
		flex: 1;
		min-height: 0;
		padding-top: 20px;
		gap: 24px;
	}
	aside {
		width: 210px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	aside button {
		text-align: left;
		padding: 13px 15px;
		color: #c6c7ca;
		border-radius: 3px;
		border-left: 3px solid transparent;
	}
	aside button.active {
		color: #f8edd4;
		border-color: #d5bc83;
		background: linear-gradient(90deg, #c6b38433, transparent);
	}
	aside button:hover {
		background-color: #ffffff0a;
	}
	.diamond {
		margin-right: 13px;
		color: #d5bc83;
	}
	.aside-note {
		margin-top: auto;
		padding: 16px 12px;
		color: #b7b7b5;
		font-size: 0.75rem;
		line-height: 1.8;
		border-top: 1px solid #c6b38433;
	}
	.content {
		flex: 1;
		min-width: 0;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}
	.tools {
		display: flex;
		gap: 12px;
		padding-bottom: 14px;
		flex-shrink: 0;
	}
	.tools input,
	.tools select {
		background: #1a2437aa;
		color: #ece5d8;
		border: 1px solid #c6b38466;
		border-radius: 4px;
		padding: 9px 14px;
		font-family: inherit;
		font-size: 0.85rem;
	}
	.tools input {
		width: min(330px, 60%);
	}
	.tools select {
		margin-left: auto;
		max-width: 40%;
	}
	.tools option {
		background: #303e53;
	}
	.scroll {
		overflow: auto;
		flex: 1;
		min-height: 0;
		padding: 2px 8px 12px 2px;
	}
	.records {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.achievement {
		display: flex;
		align-items: center;
		gap: 18px;
		padding: 18px 22px;
		background: #eae5d9;
		color: #495164;
		border-radius: 3px;
		border: 1px solid #fff9;
		box-shadow: 0 2px 3px #0002;
	}
	.achievement.earned {
		background: #dcd4c2;
	}
	.medal {
		width: 57px;
		height: 57px;
		flex-shrink: 0;
		display: grid;
		place-items: center;
		color: #b29b6b;
		font-size: 1.7rem;
		background: #d8d0be;
		border: 1px solid #b5a781;
		outline: 1px solid #c0b499;
		outline-offset: 3px;
		transform: rotate(45deg);
		margin: 7px 10px;
	}
	.medal i {
		transform: rotate(-45deg);
	}
	.medal.complete {
		background: #c2ae7c;
		color: #fff6d9;
	}
	.description {
		flex: 1;
		min-width: 0;
	}
	h2 {
		font-size: 1.05rem;
		color: inherit;
		margin: 0 0 7px;
	}
	p {
		font-size: 0.8rem;
		color: inherit;
		opacity: 0.85;
	}
	.progress-line {
		display: flex;
		align-items: center;
		gap: 14px;
		margin-top: 12px;
		font-size: 0.7rem;
	}
	.progress-line progress {
		flex: 1;
		max-width: 280px;
	}
	.progress-line span {
		white-space: nowrap;
	}
	progress {
		appearance: none;
		height: 5px;
		width: 100%;
		border: 0;
		background: #b5ad9d55;
		border-radius: 4px;
		overflow: hidden;
	}
	progress::-webkit-progress-bar {
		background: #b5ad9d55;
	}
	progress::-webkit-progress-value {
		background: #a48c55;
		border-radius: 4px;
	}
	.award {
		min-width: 95px;
		text-align: center;
		color: #9a7d42;
	}
	.award small {
		display: block;
		margin-top: 9px;
		font-size: 0.7rem;
		color: #64685f;
	}
	.earned .award small {
		color: #527660;
	}
	.sets {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(245px, 1fr));
		gap: 16px;
	}
	.set {
		text-align: left;
		display: flex;
		flex-direction: column;
		padding: 20px;
		background: #eae5d9;
		color: #495164;
		border: 1px solid #fff8;
		border-radius: 4px;
	}
	.set:hover,
	.item:hover {
		outline: 2px solid #f5e2aa;
		outline-offset: 1px;
	}
	.set-heading {
		display: flex;
		justify-content: space-between;
		color: #9c824d;
		margin-bottom: 15px;
	}
	.set-heading i {
		font-size: 1.8rem;
	}
	.set-heading span {
		font-size: 0.8rem;
	}
	.set p {
		min-height: 36px;
	}
	.mini-faces {
		display: flex;
		margin: 15px 0;
		gap: 5px;
	}
	.mini-faces img {
		width: 40px;
		height: 40px;
		background: #c5b89d;
		border-radius: 50%;
	}
	.mini-faces img.missing {
		filter: grayscale(1);
		opacity: 0.35;
	}
	.milestones {
		display: flex;
		justify-content: space-between;
		margin-top: 9px;
		font-size: 0.65rem;
		color: #78766f;
	}
	.milestones .reached {
		color: #967329;
	}
	.set-foot {
		display: flex;
		justify-content: space-between;
		border-top: 1px solid #b6aa9144;
		padding-top: 12px;
		margin-top: 16px;
		font-size: 0.8rem;
	}
	.set-foot span {
		color: #8d7546;
	}
	.complete {
		border-color: #ceb47a;
	}
	.album {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(113px, 1fr));
		gap: 15px;
	}
	.item {
		background: #eae5d9;
		border-radius: 4px;
		overflow: hidden;
		color: #3b4255;
		min-width: 0;
		align-self: start;
	}
	.portrait {
		position: relative;
		aspect-ratio: 1;
		background-size: cover;
		border-bottom-right-radius: 22px;
		overflow: hidden;
	}
	.portrait img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}
	.item.missing .portrait img {
		filter: brightness(0.35) grayscale(1);
	}
	.item.missing .portrait {
		background: #4a5265;
	}
	.copies {
		position: absolute;
		bottom: 0;
		right: 0;
		background: #3b4255ce;
		color: #f7ebcd;
		padding: 4px 8px;
		font-size: 0.7rem;
	}
	.element {
		position: absolute;
		top: 5px;
		left: 5px;
		font-size: 1.25rem;
	}
	.item-name {
		padding: 5px 4px 9px;
		font-size: 0.72rem;
		display: flex;
		flex-direction: column;
		gap: 3px;
		min-height: 48px;
	}
	.stars {
		color: #c9a052;
	}
	.set-filter {
		display: flex;
		justify-content: space-between;
		margin: 0 8px 14px 0;
		color: #e2cca0;
		font-size: 0.85rem;
	}
	.set-filter button {
		color: #ece5d8;
		font-size: 0.8rem;
		text-decoration: underline;
	}
	footer {
		padding-top: 10px;
		font-size: 0.7rem;
		color: #bfc0bf;
		line-height: 1.6;
		flex-shrink: 0;
	}
	.empty {
		padding: 40px 15px;
		text-align: center;
		color: #e0d6c3;
	}
	.empty .pill {
		display: block;
		margin: 15px auto;
	}
	.veil {
		position: fixed;
		inset: 0;
		z-index: 30;
		background: #101a2bc9;
		backdrop-filter: blur(7px);
		display: grid;
		place-items: center;
		padding: 20px;
	}
	.dialog {
		background: #eae5d9;
		color: #495164;
		border: 4px double #b8aa88;
		border-radius: 8px;
		padding: 30px;
		width: 520px;
		max-width: 100%;
		max-height: 90vh;
		overflow: auto;
		position: relative;
		text-align: center;
	}
	.dialog > .close {
		position: absolute;
		top: 12px;
		right: 12px;
	}
	.dialog h2 {
		font-size: 1.3rem;
		margin: 8px 0 15px;
	}
	.dialog h3 {
		font-weight: 400;
		font-size: 0.9rem;
		margin: 22px 0 12px;
	}
	.detail-art {
		width: 115px;
		height: 115px;
		object-fit: contain;
		background: #c9bb9e;
		border-radius: 50%;
		margin-top: 5px;
	}
	.sources {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 8px;
		max-height: 180px;
		overflow: auto;
	}
	.pill {
		font-size: 0.75rem;
		border: 1px solid #b7aa8b;
		padding: 9px 15px;
	}
	.pill:hover {
		background: #fff8e2;
	}
	.wide {
		margin-top: 20px;
		width: 100%;
	}
	.titles {
		margin-top: 20px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.title-option {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding: 14px;
		background: #dcd4c2;
		color: #495164;
		text-align: left;
		border: 1px solid transparent;
		font-size: 0.9rem;
	}
	.title-option small {
		color: #8d7546;
		font-size: 0.7rem;
		white-space: nowrap;
	}
	.title-option:disabled {
		opacity: 0.5;
	}
	.title-option:hover:not(:disabled) {
		border-color: #fff;
	}
	.title-option span {
		flex: 1;
	}
	button:focus-visible,
	input:focus-visible,
	select:focus-visible,
	.scroll:focus-visible {
		outline: 2px solid #f5d792;
		outline-offset: 3px;
	}
	@media (max-width: 900px) {
		#journal {
			padding: 14px 2%;
		}
		header {
			margin-bottom: 12px;
			gap: 12px;
		}
		.body {
			gap: 12px;
			padding-top: 12px;
		}
		aside {
			width: 155px;
		}
		aside button {
			padding: 12px 8px;
		}
		.completion {
			font-size: 0.7rem;
		}
		.tabs button {
			padding: 8px 14px;
		}
		.achievement {
			padding: 14px;
			gap: 12px;
		}
		.medal {
			width: 38px;
			height: 38px;
			font-size: 1.3rem;
			margin: 7px;
		}
		.award {
			min-width: 65px;
		}
		.sets {
			grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
		}
		.heading > i {
			font-size: 1.6rem;
		}
	}
	@media (max-width: 600px) {
		header {
			gap: 10px;
		}
		.heading {
			gap: 10px;
		}
		h1 {
			font-size: 1.15rem;
		}
		.score {
			font-size: 1.2rem;
		}
		.score small {
			font-size: 0.6rem;
		}
		.completion {
			display: none;
		}
		.tabs {
			justify-content: center;
		}
		.tabs button {
			flex: 1;
			padding: 8px;
		}
		.body {
			flex-direction: column;
			gap: 10px;
		}
		aside {
			width: 100%;
			flex-direction: row;
			overflow-x: auto;
			flex-shrink: 0;
			gap: 2px;
		}
		aside button {
			white-space: nowrap;
			padding: 8px 12px;
			border-left: 0;
			border-bottom: 2px solid transparent;
		}
		aside button.active {
			border-bottom-color: #d5bc83;
		}
		.diamond,
		.aside-note {
			display: none;
		}
		.content {
			min-height: 0;
		}
		.tools {
			padding-bottom: 10px;
		}
		.achievement {
			gap: 10px;
			padding: 12px;
		}
		.medal {
			width: 27px;
			height: 27px;
			font-size: 1rem;
			margin: 5px;
		}
		.award {
			min-width: 52px;
		}
		.description h2 {
			font-size: 0.95rem;
		}
		.description p {
			font-size: 0.75rem;
		}
		.progress-line {
			gap: 8px;
		}
		.album {
			grid-template-columns: repeat(auto-fill, minmax(85px, 1fr));
			gap: 10px;
		}
		.sets {
			grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
		}
		footer {
			font-size: 0.65rem;
		}
		.dialog {
			padding: 22px;
		}
		.title-option {
			font-size: 0.8rem;
		}
	}
	@media (max-height: 500px) {
		#journal {
			padding-top: 8px;
			padding-bottom: 8px;
		}
		header {
			margin-bottom: 8px;
		}
		.body {
			padding-top: 8px;
		}
		.aside-note {
			display: none;
		}
		.tabs {
			padding-bottom: 6px;
		}
		footer {
			display: none;
		}
	}
</style>

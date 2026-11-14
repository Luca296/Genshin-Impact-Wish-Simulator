<script>
	import { createEventDispatcher, onMount, tick } from 'svelte';
	import { assets } from '$lib/store/app-stores';
	import { owneditem } from '$lib/helpers/dataAPI/api-localstore';
	import { materials } from '$lib/helpers/progression/engine';
	import {
		plain,
		fmt,
		slotStrength,
		talentLevel,
		talentRows,
		refinementDescription,
		effectModifiers,
		characterStats,
		applyTalentState,
		constellationHits,
		evaluateTalentRow
	} from '$lib/helpers/progression/combat';
	import combat from '$lib/data/combat.json';
	import { data as weapons } from '$lib/data/weapons.json';
	import { data as characters } from '$lib/data/characters.json';
	import art from '$lib/data/progression-art.json';
	import equipmentClasses from '$lib/data/equipment-classes.json';
	import { playSfx } from '$lib/helpers/audio/audio';
	export let itemID,
		name,
		localName,
		type,
		vision,
		rarity,
		copyID,
		custom = false;
	export let images = {},
		useOutfit = false,
		outfitName = '';
	const dispatch = createEventDispatcher();
	let tab = 'stats',
		inventory = {},
		record = {},
		build = {},
		selectedCopy = copyID;
	let donorID = '',
		error = '',
		feedback = '',
		amount = 1,
		initialized = false;
	let panel;
	let messageTimer;
	let selectedSlot = 1,
		constellationOpen = false,
		selectedTalent = 'combat1',
		talentOpen = false,
		talentMode = 'info';
	let statsOpen = false,
		settingsOpen = false,
		equipmentOpen = false,
		materialOpen = false,
		showAllClasses = false;
	let inspectWeapon = null,
		inspectCopy = null;
	const defaults = {
		level: 90,
		weaponLevel: 90,
		normalLevel: 10,
		skillLevel: 10,
		burstLevel: 10,
		enemyLevel: 90,
		resistance: 10,
		damageType: 'auto',
		enabled: {}
	};
	function refresh() {
		inventory = owneditem.getAll();
		record = inventory[itemID] || {};
		if (!initialized) {
			build = { ...defaults, ...record.build };
			initialized = true;
		}
		if (type === 'weapon' && !record.copies?.some((c) => c.id === selectedCopy))
			selectedCopy = record.copies?.[0]?.id;
	}
	onMount(() => {
		refresh();
		tick().then(() => panel?.querySelector('nav button')?.focus());
		document.addEventListener('storageUpdate', refresh);
		return () => {
			document.removeEventListener('storageUpdate', refresh);
			clearTimeout(messageTimer);
		};
	});
	function trapFocus(event) {
		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			if (
				equipmentOpen ||
				materialOpen ||
				statsOpen ||
				settingsOpen ||
				talentOpen ||
				constellationOpen
			) {
				equipmentOpen =
					materialOpen =
					statsOpen =
					settingsOpen =
					talentOpen =
					constellationOpen =
						false;
			} else dispatch('close');
			return;
		}
		if (event.key !== 'Tab') return;
		const nodes = [
			...panel.querySelectorAll(
				'button:not(:disabled), select:not(:disabled), input:not(:disabled), summary'
			)
		].filter((e) => e.getClientRects().length);
		const first = nodes[0],
			last = nodes.at(-1);
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last?.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first?.focus();
		}
	}
	function save() {
		if (inventory[itemID]) owneditem.setBuild(itemID, build);
	}
	function action(fn, message) {
		error = '';
		feedback = '';
		try {
			fn();
			refresh();
			feedback = message;
			clearTimeout(messageTimer);
			messageTimer = setTimeout(() => (feedback = ''), 2600);
			playSfx('click2');
		} catch (e) {
			error = e.message;
		}
	}
	function toggleEffect(id) {
		build = { ...build, enabled: { ...build.enabled, [id]: !build.enabled?.[id] } };
		save();
	}
	$: data = custom ? null : combat[type === 'character' ? 'characters' : 'weapons'][name];
	$: constellation = record.activated || 0;
	$: available = materials(record);
	$: copies = record.copies || [];
	$: currentCopy = copies.find((c) => c.id === selectedCopy);
	$: rank = currentCopy?.refinement || 1;
	$: equippedItem = weapons.find((w) => w.itemID === Number(build.weaponItemID));
	$: equippedCopy = inventory[build.weaponItemID]?.copies?.find((c) => c.id === build.weaponCopyID);
	$: weaponData = equippedCopy ? combat.weapons[equippedItem?.name] : null;
	$: weaponRank = equippedCopy?.refinement || 1;
	$: effects = collectEffects(data, constellation, weaponData, weaponRank);
	function collectEffects(character, c, weapon, r) {
		const result = [];
		if (type !== 'character' || !character) return result;
		for (let i = 1; i <= 6; i++) {
			const strength = slotStrength(c, i),
				entry = character.constellations?.[`c${i}`];
			if (entry && strength)
				result.push({
					id: `c${i}`,
					title: `C${i} · ${entry.name} · ×${strength}`,
					description: plain(entry.description),
					modifiers: effectModifiers(entry.description, strength)
				});
		}
		if (Number(build.level) >= 20)
			for (const key of ['passive1', 'passive2']) {
				const entry = character.talents?.[key];
				if (entry)
					result.push({
						id: key,
						title: entry.name,
						description: plain(entry.description),
						modifiers: effectModifiers(entry.description)
					});
			}
		if (weapon) {
			const description = refinementDescription(weapon, r);
			result.push({
				id: 'weapon',
				title: `${weapon.name} · R${r}`,
				description,
				modifiers: effectModifiers(description)
			});
		}
		return result;
	}
	$: activeModifiers = effects.flatMap((e) =>
		build.enabled?.[e.id]
			? e.modifiers
			: e.id === 'weapon'
			? e.modifiers.filter((m) => m.automatic)
			: []
	);
	$: stats = applyTalentState(
		data,
		characterStats(data, weaponData, build, activeModifiers),
		build,
		constellation
	);
	$: maxLevel = data ? Math.max(...Object.keys(data.levels).map(Number)) : 90;
	$: extraHits = constellationHits(data, constellation);
	$: donor = copies.find((c) => c.id === donorID);
	$: roster = characters.filter(
		(c) =>
			inventory[c.itemID] && (inventory[c.itemID].wish || 0) + (inventory[c.itemID].manual || 0) > 0
	);
	$: menuPages =
		type === 'character'
			? [
					['stats', 'Attributes'],
					['weapons', 'Weapons'],
					['constellations', 'Constellation'],
					['talents', 'Talents']
			  ]
			: [
					['stats', 'Details'],
					['refinement', 'Refine']
			  ];
	$: artwork = art[name] || {};
	$: nextSlot = (constellation % 6) + 1;
	$: selectedConstellation = data?.constellations?.[`c${selectedSlot}`];
	$: selectedStrength = slotStrength(constellation, selectedSlot);
	$: talentEntry = data?.talents?.[selectedTalent];
	$: selectedTalentLevel =
		data && ['combat1', 'combat2', 'combat3'].includes(selectedTalent)
			? talentLevel(data, constellation, selectedTalent, baseTalent(selectedTalent))
			: 1;
	$: visibleWeaponData = type === 'weapon' ? data : weaponData;
	$: visibleWeaponName = type === 'weapon' ? name : equippedItem?.name;
	$: visibleRank = type === 'weapon' ? rank : weaponRank;
	$: visibleWeaponLevel =
		type === 'weapon' ? Number(build.level || 90) : Number(build.weaponLevel || 90);
	$: equipmentCandidates = weapons.flatMap((w) =>
		(inventory[w.itemID]?.copies || []).map((copy, i) => ({
			weapon: w,
			copy,
			number: i + 1,
			compatible: w.weaponType === equipmentClasses[itemID]
		}))
	);
	$: inspectedData = inspectWeapon && combat.weapons[inspectWeapon.name];
	function pageChange(page) {
		tab = page;
		error = feedback = '';
		constellationOpen =
			talentOpen =
			statsOpen =
			settingsOpen =
			equipmentOpen =
			materialOpen =
				false;
	}
	function equipSelected() {
		action(() => {
			owneditem.equip(itemID, inspectWeapon.itemID, inspectCopy.id);
			build = { ...build, weaponItemID: inspectWeapon.itemID, weaponCopyID: inspectCopy.id };
			save();
			equipmentOpen = false;
		}, `${inspectWeapon ? combat.weapons[inspectWeapon.name]?.name || inspectWeapon.name : 'Weapon'} equipped.`);
	}
	function equippedBy(id) {
		const owner = characters.find((c) => inventory[c.itemID]?.build?.weaponCopyID === id);
		return owner ? combat.characters[owner.name]?.name || owner.name : '';
	}
	function iconFor(key, category = 'talents') {
		const file = artwork[category]?.[key];
		return file ? `/progression/${file}` : '';
	}
	const isEquipped = (id) => Object.values(inventory).some((r) => r.build?.weaponCopyID === id);
	function damage(row, key) {
		const physical =
			build.damageType === 'physical' ||
			(build.damageType === 'auto' &&
				key === 'combat1' &&
				data?.weaponType !== 'WEAPON_CATALYST' &&
				!stats?.infused);
		let bonus = physical ? stats?.physical || 0 : stats?.elemental || 0;
		const scope =
			key === 'combat2'
				? 'skill'
				: key === 'combat3'
				? 'burst'
				: /Charged/.test(row.name)
				? 'charged'
				: 'normal';
		bonus += activeModifiers.filter((e) => e.scope === scope).reduce((n, e) => n + e.value, 0);
		const addedDamage = activeModifiers
			.filter((e) => e.scope === 'named' && row.name.includes(e.target))
			.reduce((n, e) => n + e.value * (stats?.[e.stat] || 0), 0);
		return evaluateTalentRow(row, stats, build, bonus, addedDamage);
	}
	function baseTalent(key) {
		return Number(
			build[{ combat1: 'normalLevel', combat2: 'skillLevel', combat3: 'burstLevel' }[key]] || 10
		);
	}
</script>

<section
	bind:this={panel}
	on:keydown={trapFocus}
	class:refining={tab === 'refinement'}
	class="character-sheet {type === 'weapon' ? 'weapon-menu' : vision || 'hydro'}"
	role="dialog"
	aria-modal="true"
	aria-label={`${localName} details`}
>
	<div class="cosmic-field" aria-hidden="true">
		{#each Array(95) as _, i}<i
				style={`--x:${((i * 173 + 37) % 1000) / 10}%;--y:${((i * 317 + 11) % 1000) / 10}%;--s:${
					i % 7 === 0 ? 3 : 1
				}px;--o:${0.18 + (i % 5) * 0.13}`}
			/>{/each}
		<div class="nebula" />
	</div>
	<header class="menu-header">
		<div class="identity">
			<span class="vision-symbol gi-{vision || (type === 'weapon' ? 'weapon' : 'star')}" /><span
				>{type === 'weapon' ? data?.weaponText || 'Weapon' : data?.elementText || vision} / {localName}</span
			>
		</div>
		{#if type === 'character'}<div class="portrait-strip" aria-label="Characters">
				{#each roster as character}<button
						class:chosen={character.itemID === itemID}
						aria-label={`View ${combat.characters[character.name]?.name || character.name}`}
						on:click={() => dispatch('select', { itemID: character.itemID })}
						><img src={$assets[`face/${character.name}`]} alt="" /></button
					>{/each}
			</div>{/if}
		<button class="leave-button" aria-label="Close details" on:click={() => dispatch('close')}
			>✕</button
		>
	</header>
	<nav class="menu-navigation" aria-label="Character detail pages">
		{#each menuPages as [page, title]}<button
				aria-label={title}
				class:active={tab === page}
				aria-current={tab === page ? 'page' : undefined}
				on:click={() => pageChange(page)}
				><span class="nav-diamond" aria-hidden="true">{tab === page ? '◈' : '◆'}</span
				>{title}</button
			>{/each}
	</nav>
	{#if feedback}<div class="toast" role="status">{feedback}</div>{/if}
	{#if error}<div class="toast error" role="alert">{error}</div>{/if}

	{#if tab === 'constellations'}
		<div class="constellation-stage">
			{#if artwork.diagram}<img
					class="constellation-diagram"
					src={`/progression/${artwork.diagram}`}
					alt={`${data?.constellation || localName} constellation`}
				/>
			{:else}<svg
					class="fallback-diagram"
					viewBox="0 0 600 700"
					aria-label="Six constellation stars"
					><path
						d="M180 110 L410 180 L280 350 L440 480 L290 610 L150 490 Z M180 110 L280 350 L290 610 M150 490 L440 480"
					/>{#each [[180, 110], [410, 180], [280, 350], [440, 480], [290, 610], [150, 490]] as point, i}<circle
							class:lit={slotStrength(constellation, i + 1) > 0}
							cx={point[0]}
							cy={point[1]}
							r="6"
						/>{/each}</svg
				>{/if}
			<div class="constellation-caption">
				{data?.constellation || localName}<small
					>C{constellation}{constellation > 6
						? ` · Cycle ${Math.ceil(constellation / 6)}`
						: ''}</small
				>
			</div>
		</div>
		<div class="constellation-list">
			{#each Array(6) as _, i}
				{@const strength = slotStrength(constellation, i + 1)}
				<button
					class:unlocked={strength > 0}
					class:selected={constellationOpen && selectedSlot === i + 1}
					class:ready={nextSlot === i + 1 && available > 0}
					aria-label={`C${i + 1} ${data?.constellations?.[`c${i + 1}`]?.name || 'Constellation'}`}
					on:click={() => {
						selectedSlot = i + 1;
						constellationOpen = true;
					}}
				>
					<span class="constellation-medallion"
						>{#if iconFor(`c${i + 1}`, 'icons')}<img
								src={iconFor(`c${i + 1}`, 'icons')}
								alt=""
							/>{:else}<span>✦</span>{/if}{#if !strength}<svg
								class="lock-symbol"
								viewBox="0 0 24 24"
								aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v12H5z" /></svg
							>{/if}</span
					>
					<span
						>{data?.constellations?.[`c${i + 1}`]?.name ||
							`Constellation ${i + 1}`}{#if strength > 1}<small>Strength {strength}</small
							>{/if}</span
					>
				</button>
			{/each}
		</div>
		<div class="material-count">
			<img src={$assets[`stella-fortuna-${rarity}star.webp`]} alt="" /><span
				>{available} Stela Fortuna available</span
			>
		</div>
		{#if constellationOpen}<div class="parchment constellation-detail">
				<button
					class="panel-close"
					aria-label="Close constellation"
					on:click={() => (constellationOpen = false)}>✕</button
				>
				<div class="detail-emblem">
					{#if iconFor(`c${selectedSlot}`, 'icons')}<img
							src={iconFor(`c${selectedSlot}`, 'icons')}
							alt=""
						/>{:else}✦{/if}
				</div>
				<h2>{selectedConstellation?.name || `Constellation ${selectedSlot}`}</h2>
				<div class="ornament">✦</div>
				<small
					>Constellation Lv. {selectedSlot}{selectedStrength > 1
						? ` · Strength ${selectedStrength}`
						: ''}</small
				>
				<div class="panel-copy">
					<p>
						{plain(
							selectedConstellation?.description ||
								'No verified constellation description available.'
						)}
					</p>
					{#if selectedStrength > 1}<h3>Current strength</h3>
						{#each effectModifiers(selectedConstellation?.description, selectedStrength) as modifier}<p
								class="scaled-effect"
							>
								{modifier.text} → {fmt(
									modifier.value * (modifier.stat === 'em' ? 1 : 100)
								)}{modifier.stat === 'em' ? '' : '%'}
							</p>{/each}
						<p class="subtle">
							Numeric effects repeat each cycle. Mechanical unlocks occur once.
						</p>{/if}
				</div>
				<div class="activation-footer">
					<div class="cost">
						<img src={$assets[`stella-fortuna-${rarity}star.webp`]} alt="Stela Fortuna" /><span
							>{available} / {amount || 1}</span
						>
					</div>
					<label
						>Materials to spend<input
							aria-label="Constellations to activate"
							type="number"
							min="1"
							max={available || 1}
							bind:value={amount}
						/></label
					><button
						aria-label={`Activate C${constellation + (amount || 1)}`}
						class="game-button"
						disabled={!available ||
							selectedSlot !== nextSlot ||
							!Number.isSafeInteger(amount) ||
							amount < 1 ||
							amount > available}
						on:click={() =>
							action(
								() => owneditem.activate(itemID, amount),
								`Constellation activated · C${constellation + amount}`
							)}>Activate C{constellation + (amount || 1)}</button
					>{#if selectedSlot !== nextSlot}<small>Next activation: C{constellation + 1}</small>{/if}
				</div>
			</div>{/if}
	{:else if tab === 'refinement'}
		<div class="weapon-stage">
			<div class="weapon-halo" />
			<img src={$assets[name]} alt={localName} />
			<div class="weapon-reflection"><img src={$assets[name]} alt="" /></div>
		</div>
		<div class="right-panel refinement-info">
			<h1>Rank {rank}</h1>
			<p class="gold-label">Weapon Refinement Level</p>
			<div class="ornament">✦</div>
			<h2>{data?.effectName || 'Weapon passive'}</h2>
			<div class="rank-comparison">
				<p>
					<span class="comparison-label">Current:</span>
					{data ? refinementDescription(data, rank) : 'Verified passive unavailable.'}
				</p>
				<p class="next-rank">
					<span class="comparison-label">Rank {rank + (donor?.refinement || 1)}:</span>
					{data
						? refinementDescription(data, rank + (donor?.refinement || 1))
						: 'Verified passive unavailable.'}
				</p>
			</div>
			<div class="refinement-footer">
				<div class="ornament">✦</div>
				<h3>Identical Weapon Materials</h3>
				<div class="material-slots">
					<button
						class="material-slot"
						aria-label="Choose refinement material"
						on:click={() => (materialOpen = true)}
						>{#if donor}<img src={$assets[name]} alt="" /><span>R{donor.refinement}</span>{:else}<b
								>+</b
							><span>—</span>{/if}</button
					>{#each Array(3) as _}<span class="empty-material">+</span>{/each}
				</div>
				<small
					>{donor
						? `The selected R${donor.refinement} copy will be consumed.`
						: 'Select an unlocked, unequipped copy.'}</small
				><button
					aria-label={donor
						? `Confirm refinement to R${rank + donor.refinement}`
						: 'Confirm refinement'}
					class="game-button"
					disabled={!donor || donor.locked || isEquipped(donor.id)}
					on:click={() => {
						action(() => owneditem.refine(itemID, selectedCopy, donorID), 'Refinement successful');
						donorID = '';
					}}>Confirm refinement{donor ? ` to R${rank + donor.refinement}` : ''}</button
				>
			</div>
		</div>
	{:else if tab === 'weapons' || type === 'weapon'}
		<div class="weapon-stage">
			{#if visibleWeaponName}<div class="weapon-halo" />
				<img src={$assets[visibleWeaponName]} alt={visibleWeaponData?.name || visibleWeaponName} />
				<div class="weapon-reflection">
					<img src={$assets[visibleWeaponName]} alt="" />
				</div>{:else}<span class="empty-weapon gi-weapon" />{/if}
		</div>
		<div class="right-panel weapon-info">
			<h1>
				{visibleWeaponData?.name ||
					(visibleWeaponName
						? type === 'weapon'
							? localName
							: visibleWeaponName
						: 'No weapon equipped')}
			</h1>
			<p>{visibleWeaponData?.weaponText || data?.weaponText || 'Weapon'}</p>
			<div class="weapon-base-stats">
				<div>
					<span>Base ATK</span><strong
						>{fmt(visibleWeaponData?.levels?.[visibleWeaponLevel]?.attack, 0)}</strong
					>
				</div>
				{#if visibleWeaponData}<div>
						<span>{visibleWeaponData.mainStatText}</span><strong
							>{fmt(
								visibleWeaponData.levels?.[visibleWeaponLevel]?.specialized *
									(visibleWeaponData.mainStatType === 'FIGHT_PROP_ELEMENT_MASTERY' ? 1 : 100)
							)}{visibleWeaponData.mainStatType === 'FIGHT_PROP_ELEMENT_MASTERY' ? '' : '%'}</strong
						>
					</div>{/if}
			</div>
			<div class="rarity-stars">{'★'.repeat(visibleWeaponData?.rarity || rarity)}</div>
			<p class="level-pill">Lv. {visibleWeaponLevel} / 90</p>
			<p class="gold-label">Refinement Rank {visibleRank}</p>
			<h3>{visibleWeaponData?.effectName || ''}</h3>
			<p class="passive-copy">
				{visibleWeaponData
					? refinementDescription(visibleWeaponData, visibleRank)
					: 'Choose a compatible weapon from your inventory.'}
			</p>
			{#if type === 'character'}<div class="bottom-actions">
					<button
						aria-label="Switch"
						class="game-button"
						on:click={() => {
							equipmentOpen = true;
							inspectWeapon = equippedItem || null;
							inspectCopy = equippedCopy || null;
						}}>Switch</button
					><button
						aria-label="Details"
						class="game-button secondary"
						disabled={!equippedCopy}
						on:click={() =>
							dispatch('select', { itemID: equippedItem.itemID, copyID: equippedCopy.id })}
						>Details</button
					>
				</div>{:else}<div class="bottom-actions">
					<button aria-label="Refine" class="game-button" on:click={() => pageChange('refinement')}
						>Refine</button
					><button
						class="game-button secondary"
						on:click={() =>
							action(
								() => owneditem.lock(itemID, selectedCopy),
								currentCopy?.locked ? 'Weapon unlocked' : 'Weapon locked'
							)}>{currentCopy?.locked ? 'Unlock' : 'Lock'}</button
					>
				</div>{/if}
		</div>
	{:else}
		<div class="character-stage">
			<div class="character-aura" />
			<img
				src={custom
					? images.artURL
					: $assets[`splash-art/${useOutfit && outfitName ? outfitName : name}`]}
				alt={localName}
			/>
		</div>
		{#if tab === 'stats'}<div class="right-panel attributes-info">
				<h1>{localName}</h1>
				<div class="rarity-stars">{'★'.repeat(rarity)}</div>
				<div class="character-level">
					<span>Level {build.level || 90} / 90</span><button
						aria-label="Change build settings"
						on:click={() => (settingsOpen = true)}>✧</button
					>
				</div>
				<div class="xp-line" />
				{#if stats}<div class="attribute-list">
						{#each [['Max HP', fmt(stats.hp, 0), '♡'], ['ATK', fmt(stats.attack, 0), '⚔'], ['DEF', fmt(stats.defense, 0), '◇'], ['Elemental Mastery', fmt(stats.em, 0), '✧']] as stat}<div
							>
								<span><i>{stat[2]}</i>{stat[0]}</span><strong>{stat[1]}</strong>
							</div>{/each}
					</div>
					<button
						aria-label="Details"
						class="text-button details-link"
						on:click={() => (statsOpen = true)}>Details <span>≡</span></button
					>{:else}<p class="unavailable">Verified stats are unavailable for this character.</p>{/if}
				<div class="attribute-divider" />
				<div class="constellation-summary">
					<span>Constellation</span><span>C{constellation}</span>
				</div>
				<p class="character-description">{data?.description || ''}</p>
				<button class="game-button build-button" on:click={() => (settingsOpen = true)}
					>Build settings</button
				>
			</div>
		{:else if tab === 'talents'}<div class="talent-list">
				{#each Object.keys(data?.talents || {}).filter( (key) => /^(combat|passive)/.test(key) ) as key}
					<button
						class:selected={talentOpen && selectedTalent === key}
						on:click={() => {
							selectedTalent = key;
							talentOpen = true;
							talentMode = 'info';
						}}
						><span class="talent-medallion"
							>{#if iconFor(key)}<img src={iconFor(key)} alt="" />{:else}✧{/if}</span
						><span
							>{key === 'combat1' ? 'Normal Attack: ' : ''}{data.talents[key].name}<small
								>Lv. {['combat1', 'combat2', 'combat3'].includes(key)
									? talentLevel(data, constellation, key, baseTalent(key))
									: 1}</small
							></span
						></button
					>
				{/each}
				<p>Select a talent to view its details</p>
			</div>{/if}
	{/if}

	{#if type === 'weapon' && copies.length}<div class="copy-selector">
			<label
				>Weapon copy<select
					aria-label="Selected weapon copy"
					bind:value={selectedCopy}
					on:change={() => {
						donorID = '';
						feedback = '';
					}}
					>{#each copies as copy, i}<option value={copy.id}
							>Copy {i + 1} · R{copy.refinement}{copy.locked ? ' · Locked' : ''}{isEquipped(copy.id)
								? ' · Equipped'
								: ''}</option
						>{/each}</select
				></label
			>
		</div>{/if}
	<footer class="menu-footer">
		<button on:click={() => dispatch('art')}><span>▧</span> Artwork</button><small
			>{type === 'character' ? `C${constellation}` : `R${rank}`}</small
		><button on:click={() => dispatch('close')}><span>◯</span> Leave</button>
	</footer>

	{#if talentOpen && talentEntry}<div class="parchment talent-detail">
			<button class="panel-close" aria-label="Close talent" on:click={() => (talentOpen = false)}
				>✕</button
			>
			<div class="detail-emblem">
				{#if iconFor(selectedTalent)}<img src={iconFor(selectedTalent)} alt="" />{:else}✧{/if}
			</div>
			<h2>{talentEntry.name}</h2>
			<small>Lv. {selectedTalentLevel}</small>
			<div class="panel-tabs">
				<button class:active={talentMode === 'info'} on:click={() => (talentMode = 'info')}
					>Talent Info</button
				><button
					class:active={talentMode === 'attributes'}
					on:click={() => (talentMode = 'attributes')}>Skill Attributes</button
				>{#if ['combat1', 'combat2', 'combat3'].includes(selectedTalent)}<button
						class:active={talentMode === 'damage'}
						on:click={() => (talentMode = 'damage')}>Damage</button
					>{/if}
			</div>
			<div class="panel-copy">
				{#if talentMode === 'info'}<p>{plain(talentEntry.description)}</p>
				{:else if talentMode === 'attributes'}<div class="skill-attributes">
						{#each talentRows(talentEntry, selectedTalentLevel) as row}<div>
								<span>{row.name}</span><strong>{row.formula}</strong>
							</div>{/each}
					</div>
				{:else}<p class="subtle">
						Per hit, against level {build.enemyLevel || 90} with {build.resistance ?? 10}%
						resistance. Uses active build modifiers.
					</p>
					<div class="table-scroll">
						<table>
							<thead><tr><th>Hit</th><th>Non-crit</th><th>Crit</th><th>Average</th></tr></thead
							><tbody
								>{#each talentRows(talentEntry, selectedTalentLevel) as row}{@const hits = damage(
										row,
										selectedTalent
									)}{#if hits.length}<tr
											><td>{row.name}</td><td>{hits.map((h) => fmt(h.normal, 0)).join(' / ')}</td
											><td>{hits.map((h) => fmt(h.critical, 0)).join(' / ')}</td><td
												>{hits.map((h) => fmt(h.average, 0)).join(' / ')}</td
											></tr
										>{/if}{/each}</tbody
							>
						</table>
					</div>
					{#if extraHits.length}<h3>Constellation attacks</h3>
						<p class="subtle">
							Per triggered attack. Trigger conditions follow the constellation description.
						</p>
						<div class="table-scroll">
							<table>
								<thead><tr><th>Hit</th><th>Average</th></tr></thead><tbody
									>{#each extraHits as row}{@const hits = damage(row, 'constellation')}<tr
											><td>{row.name}</td><td>{hits.map((h) => fmt(h.average, 0)).join(' / ')}</td
											></tr
										>{/each}</tbody
								>
							</table>
						</div>{/if}
				{/if}
			</div>
			{#if ['combat1', 'combat2', 'combat3'].includes(selectedTalent)}<div
					class="talent-level-control"
				>
					<label
						>Base talent level<select
							aria-label="Talent level"
							bind:value={build[
								{ combat1: 'normalLevel', combat2: 'skillLevel', combat3: 'burstLevel' }[
									selectedTalent
								]
							]}
							on:change={save}
							>{#each Array(10) as _, i}<option value={i + 1}>{i + 1}</option>{/each}</select
						></label
					>{#if selectedTalentLevel > baseTalent(selectedTalent)}<small
							>+{selectedTalentLevel - baseTalent(selectedTalent)} from constellations</small
						>{/if}
				</div>{/if}
		</div>{/if}

	{#if statsOpen}<div class="shade">
			<div class="stats-detail parchment">
				<div class="modal-heading">
					<h2>Details</h2>
					<button aria-label="Close stats" on:click={() => (statsOpen = false)}>✕</button>
				</div>
				<div class="panel-copy">
					<h3>Base Stats</h3>
					<div class="skill-attributes">
						{#each [['Max HP', fmt(stats?.hp, 0)], ['ATK', fmt(stats?.attack, 0)], ['DEF', fmt(stats?.defense, 0)], ['Elemental Mastery', fmt(stats?.em, 0)]] as stat}<div
							>
								<span>{stat[0]}</span><strong>{stat[1]}</strong>
							</div>{/each}
					</div>
					<h3>Advanced Stats</h3>
					<div class="skill-attributes">
						{#each [['CRIT Rate', `${fmt(stats?.critRate * 100)}%`], ['CRIT DMG', `${fmt(stats?.critDamage * 100)}%`], ['Energy Recharge', `${fmt(stats?.recharge * 100)}%`], ['Healing Bonus', `${fmt(stats?.healing * 100)}%`], [`${data?.elementText} DMG Bonus`, `${fmt(stats?.elemental * 100)}%`], ['Physical DMG Bonus', `${fmt(stats?.physical * 100)}%`]] as stat}<div
							>
								<span>{stat[0]}</span><strong>{stat[1]}</strong>
							</div>{/each}
					</div>
				</div>
			</div>
		</div>{/if}

	{#if settingsOpen}<div class="shade">
			<div class="settings-detail parchment">
				<div class="modal-heading">
					<h2>Build settings</h2>
					<button aria-label="Close build settings" on:click={() => (settingsOpen = false)}
						>✕</button
					>
				</div>
				<div class="panel-copy">
					<div class="settings-grid">
						<label
							>Character level<select aria-label="Level" bind:value={build.level} on:change={save}
								>{#each Array(maxLevel) as _, i}<option value={i + 1}>{i + 1}</option
									>{/each}</select
							></label
						><label
							>Weapon level<input
								type="number"
								min="1"
								max="90"
								bind:value={build.weaponLevel}
								on:change={save}
							/></label
						><label
							>Enemy level<input
								type="number"
								min="1"
								max="200"
								bind:value={build.enemyLevel}
								on:change={save}
							/></label
						><label
							>Resistance %<input
								type="number"
								bind:value={build.resistance}
								on:change={save}
							/></label
						>
					</div>
					<details>
						<summary>Additional stats</summary>
						<div class="settings-grid">
							{#each [['hpPercent', 'HP %'], ['atkPercent', 'ATK %'], ['defPercent', 'DEF %'], ['flatHP', 'Flat HP'], ['flatATK', 'Flat ATK'], ['flatDEF', 'Flat DEF'], ['critRate', 'CRIT Rate %'], ['critDamage', 'CRIT DMG %'], ['em', 'Elemental Mastery'], ['recharge', 'Energy Recharge %'], ['elemental', 'Elemental DMG %'], ['physical', 'Physical DMG %'], ['damageBonus', 'All DMG Bonus %'], ['defReduction', 'Enemy DEF reduction %'], ['defIgnore', 'Enemy DEF ignore %']] as field}<label
									>{field[1]}<input
										type="number"
										bind:value={build[field[0]]}
										on:change={save}
									/></label
								>{/each}
						</div>
					</details>
					<h3>Combat conditions</h3>
					<label class="check"
						><input type="checkbox" bind:checked={build.skillActive} on:change={save} />Skill state
						active</label
					><label class="check"
						><input type="checkbox" bind:checked={build.burstActive} on:change={save} />Burst state
						active</label
					><label class="check"
						><input type="checkbox" bind:checked={build.lowHP} on:change={save} />HP below 50%</label
					><label
						>Damage type<select bind:value={build.damageType} on:change={save}
							><option value="auto">Auto per talent</option><option value="elemental"
								>{data?.elementText}</option
							><option value="physical">Physical</option></select
						></label
					>
					<h3>Conditional effects</h3>
					<p class="subtle">
						Recognized unconditional weapon bonuses apply when equipped. Enable other modifiers when
						their conditions are met.
					</p>
					{#each effects as effect}<details>
							<summary>{effect.title}</summary>
							<p>{effect.description}</p>
							{#if effect.modifiers.length}<label class="check"
									><input
										type="checkbox"
										checked={!!build.enabled?.[effect.id]}
										on:change={() => toggleEffect(effect.id)}
									/>Enable conditional modifiers</label
								>{#each effect.modifiers as modifier}<p class="subtle">
										{modifier.text} · {fmt(
											modifier.value * (modifier.stat === 'em' ? 1 : 100)
										)}{modifier.stat === 'em' ? '' : '%'}
									</p>{/each}{:else}<p class="subtle">
									Use additional stats for conditional contributions.
								</p>{/if}
						</details>{/each}
				</div>
			</div>
		</div>{/if}

	{#if equipmentOpen}<div class="equipment-screen">
			<header>
				<h2>Weapon Selection</h2>
				<button aria-label="Close weapon selection" on:click={() => (equipmentOpen = false)}
					>✕</button
				>
			</header>
			<div class="equipment-layout">
				<div class="equipment-inventory">
					<div class="equipment-filter">
						<span>{data?.weaponText || 'Unknown weapon class'}</span><label class="check"
							><input type="checkbox" bind:checked={showAllClasses} />All weapon classes</label
						>
					</div>
					<div class="equipment-grid">
						{#each equipmentCandidates.filter((c) => showAllClasses || c.compatible) as candidate}<button
								class="weapon-card star{candidate.weapon.rarity}"
								class:selected={inspectCopy?.id === candidate.copy.id}
								disabled={!candidate.compatible}
								aria-label={`${
									combat.weapons[candidate.weapon.name]?.name || candidate.weapon.name
								} Copy ${candidate.number} R${candidate.copy.refinement}${
									candidate.compatible ? '' : ' incompatible class'
								}`}
								on:click={() => {
									inspectWeapon = candidate.weapon;
									inspectCopy = candidate.copy;
								}}
								><img src={$assets[candidate.weapon.name]} alt="" /><span class="copy-rank"
									>R{candidate.copy.refinement}</span
								><small class="card-rarity">{'★'.repeat(candidate.weapon.rarity)}</small><span
									class="card-caption"
									>{combat.weapons[candidate.weapon.name]?.name || candidate.weapon.name}<small
										>Copy {candidate.number}{candidate.copy.locked ? ' · Locked' : ''}</small
									></span
								>{#if equippedBy(candidate.copy.id)}<span class="equipped-tag">Equipped</span
									>{/if}</button
							>{/each}
					</div>
					{#if !equipmentCandidates.some((c) => c.compatible)}<p>
							No compatible weapons owned.
						</p>{/if}
				</div>
				<div class="equipment-preview">
					{#if inspectWeapon && inspectCopy}<h1>{inspectedData?.name || inspectWeapon.name}</h1>
						<p>{inspectedData?.weaponText || inspectWeapon.weaponType}</p>
						<img class="preview-weapon" src={$assets[inspectWeapon.name]} alt="" />
						<p class="gold-label">
							Copy {inventory[inspectWeapon.itemID]?.copies.findIndex(
								(c) => c.id === inspectCopy.id
							) + 1} · Refinement Rank {inspectCopy.refinement}
						</p>
						<h3>{inspectedData?.effectName || ''}</h3>
						<p>
							{inspectedData
								? refinementDescription(inspectedData, inspectCopy.refinement)
								: 'Verified passive data unavailable.'}
						</p>
						{#if equippedBy(inspectCopy.id)}<p>
								Currently equipped by {equippedBy(inspectCopy.id)}
							</p>{/if}<button
							aria-label={inspectCopy.id === build.weaponCopyID ? 'Equipped' : 'Equip'}
							class="game-button"
							disabled={inspectWeapon.weaponType !== equipmentClasses[itemID] ||
								inspectCopy.id === build.weaponCopyID}
							on:click={equipSelected}
							>{inspectCopy.id === build.weaponCopyID ? 'Equipped' : 'Equip'}</button
						>{:else}<p>Select a weapon to compare</p>{/if}
				</div>
			</div>
		</div>{/if}

	{#if materialOpen}<div class="material-drawer parchment">
			<div class="modal-heading">
				<h2>Select Material</h2>
				<button aria-label="Close material selection" on:click={() => (materialOpen = false)}
					>✕</button
				>
			</div>
			<p class="subtle">The selected copy is consumed during refinement.</p>
			<div class="material-grid">
				{#each copies as copy, i}{#if copy.id !== selectedCopy}<button
							class="weapon-card star{rarity}"
							disabled={copy.locked || isEquipped(copy.id)}
							aria-label={`Material Copy ${i + 1} R${copy.refinement}`}
							on:click={() => {
								donorID = copy.id;
								materialOpen = false;
							}}
							><img src={$assets[name]} alt="" /><span class="copy-rank">R{copy.refinement}</span
							><span class="card-caption"
								>Copy {i + 1}<small
									>{copy.locked ? 'Locked' : isEquipped(copy.id) ? 'Equipped' : 'Available'}</small
								></span
							></button
						>{/if}{/each}
			</div>
			{#if copies.length < 2}<p>No duplicate copies available.</p>{/if}
		</div>{/if}
</section>

<style>
	.character-sheet {
		--tone: 30, 72, 111;
		--light: 70, 156, 194;
		position: fixed;
		inset: 0;
		width: 100vw;
		height: 100vh;
		z-index: 60;
		overflow: hidden;
		color: #ece5d8;
		font-size: 16px;
		background: #101e34;
		isolation: isolate;
	}
	.pyro {
		--tone: 100, 26, 19;
		--light: 190, 63, 27;
	}
	.hydro {
		--tone: 18, 55, 101;
		--light: 36, 142, 204;
	}
	.anemo {
		--tone: 22, 75, 72;
		--light: 36, 151, 137;
	}
	.electro {
		--tone: 52, 32, 91;
		--light: 133, 80, 177;
	}
	.geo {
		--tone: 77, 52, 26;
		--light: 169, 131, 61;
	}
	.cryo {
		--tone: 22, 63, 87;
		--light: 80, 156, 186;
	}
	.dendro {
		--tone: 32, 69, 32;
		--light: 105, 148, 61;
	}
	.weapon-menu {
		--tone: 48, 37, 77;
		--light: 115, 92, 147;
	}
	.cosmic-field {
		overflow: hidden;
		position: absolute;
		inset: 0;
		z-index: -2;
		background: radial-gradient(ellipse at 48% 125%, rgba(var(--light), 0.95), transparent 67%),
			radial-gradient(ellipse at 50% 30%, rgba(var(--tone), 0.6), #060d1c 115%), rgb(var(--tone));
	}
	.cosmic-field > i {
		position: absolute;
		left: var(--x);
		top: var(--y);
		width: var(--s);
		height: var(--s);
		opacity: var(--o);
		border-radius: 50%;
		background: #fff7d2;
		box-shadow: 0 0 5px #e1e5ff;
	}
	.nebula {
		position: absolute;
		inset: 12% 5% -25%;
		filter: blur(70px);
		opacity: 0.2;
		background: radial-gradient(ellipse at 25% 70%, #5ec2df, transparent 48%),
			radial-gradient(ellipse at 80% 70%, #b169d8, transparent 40%);
		transform: rotate(-12deg);
	}
	button,
	input,
	select {
		font: inherit;
		color: inherit;
	}
	button {
		cursor: pointer;
	}
	button:focus-visible,
	input:focus-visible,
	select:focus-visible,
	summary:focus-visible {
		outline: 2px solid #fff4d3;
		outline-offset: 5px;
	}
	button:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}
	button:hover:not(:disabled) {
		filter: brightness(1.17);
	}
	button {
		border: 0;
	}
	button:not(.game-button) {
		background: transparent;
	}
	p {
		line-height: 1.6;
		white-space: pre-line;
	}
	h1,
	h2,
	h3 {
		font-weight: 400;
	}
	h1 {
		font-size: 29px;
		text-align: left;
		margin: 0 0 8px;
	}
	h2 {
		font-size: 22px;
	}
	h3 {
		font-size: 17px;
		margin: 16px 0 9px;
	}
	.menu-header {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 100px;
		padding: 22px 3.5%;
		display: flex;
		align-items: center;
		gap: 35px;
		z-index: 5;
	}
	.identity {
		display: flex;
		align-items: center;
		gap: 16px;
		color: #e9ddb9;
		font-size: 16px;
		white-space: nowrap;
		min-width: 240px;
	}
	.vision-symbol {
		display: grid;
		place-items: center;
		font-size: 37px;
		width: 52px;
		height: 52px;
		filter: drop-shadow(0 0 9px rgba(var(--light), 0.7));
	}
	.portrait-strip {
		display: flex;
		gap: 13px;
		overflow-x: auto;
		max-width: calc(100% - 360px);
		padding: 4px 5px 12px;
		scrollbar-width: none;
	}
	.portrait-strip > button {
		position: relative;
		width: 52px;
		height: 52px;
		flex-shrink: 0;
		border: 2px solid #b0aaa06b;
		border-radius: 50%;
		padding: 0;
		overflow: visible;
		background: rgba(var(--tone), 0.6);
	}
	.portrait-strip img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 50%;
	}
	.portrait-strip .chosen {
		border-color: #f4ddaf;
	}
	.portrait-strip .chosen:after {
		position: absolute;
		content: '';
		height: 3px;
		background: #e8e1b5;
		box-shadow: 0 0 8px #f8e4bd;
		bottom: -11px;
		left: 0;
		right: 0;
	}
	.leave-button {
		margin-left: auto;
		flex-shrink: 0;
		background: #e8e2d3 !important;
		color: #4b515b;
		border: 3px solid #a7a69f;
		border-radius: 50%;
		width: 35px;
		height: 35px;
		font-size: 20px;
		display: grid;
		place-items: center;
		padding: 0;
	}
	.menu-navigation {
		position: absolute;
		left: 5%;
		top: 17%;
		display: flex;
		flex-direction: column;
		gap: 17px;
		z-index: 5;
		max-width: 220px;
	}
	.menu-navigation button {
		display: flex;
		align-items: center;
		gap: 12px;
		text-align: left;
		font-size: 22px;
		color: #cdc9c5;
		text-shadow: 0 1px 4px #0008;
		padding: 4px 3px;
		white-space: nowrap;
	}
	.menu-navigation .active {
		font-size: 25px;
		color: #fff9e9;
		filter: drop-shadow(0 0 9px #fff6b733);
	}
	.nav-diamond {
		font-size: 12px;
		color: #b4b1a2;
	}
	.menu-navigation .active .nav-diamond {
		font-size: 20px;
		color: #fff8d6;
	}
	.menu-footer {
		position: absolute;
		left: 5%;
		right: 5%;
		bottom: 28px;
		display: flex;
		align-items: center;
		gap: 20px;
		z-index: 5;
		font-size: 14px;
	}
	.menu-footer small {
		margin-left: auto;
		margin-right: 15px;
		color: #e1d5b8;
	}
	.menu-footer button {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 0;
	}
	.menu-footer button > span {
		font-size: 23px;
	}
	.character-stage {
		position: absolute;
		left: 18%;
		right: 30%;
		top: 12%;
		bottom: 7%;
		pointer-events: none;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.character-stage > img {
		height: 105%;
		width: 115%;
		max-width: none;
		object-fit: contain;
		mask-image: linear-gradient(90deg, transparent, #000 8%, #000 88%, transparent);
		filter: drop-shadow(0 15px 22px #0004);
	}
	.character-aura {
		position: absolute;
		inset: 5% 12% 0;
		background: radial-gradient(ellipse, rgba(var(--light), 0.18), transparent 67%);
		z-index: -1;
	}
	.right-panel {
		position: absolute;
		top: 16%;
		right: 5%;
		bottom: 13%;
		width: 27%;
		max-width: 420px;
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: #e9e1c977 transparent;
		text-shadow: 0 1px 2px #0003;
	}
	.attributes-info {
		padding-top: 2%;
	}
	.rarity-stars {
		color: #f6ce70;
		font-size: 21px;
		letter-spacing: 2px;
		margin: 4px 0 20px;
		text-shadow: 0 0 5px #e6c06a66;
	}
	.character-level {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 20px;
	}
	.character-level button {
		font-size: 24px;
		padding: 0 6px;
	}
	.xp-line {
		height: 3px;
		background: linear-gradient(90deg, #d4cdb5 20%, #f2e7be44 20%);
		margin: 10px 0 25px;
	}
	.attribute-list > div {
		display: flex;
		justify-content: space-between;
		padding: 10px 8px;
		gap: 12px;
	}
	.attribute-list > div:nth-child(odd) {
		background: #ffffff0c;
	}
	.attribute-list strong {
		font-weight: 400;
	}
	.attribute-list i {
		font-style: normal;
		width: 25px;
		display: inline-block;
		margin-right: 9px;
		color: #e7deca;
		text-align: center;
	}
	.text-button {
		color: #f4ecd9;
		padding: 10px 5px;
	}
	.details-link {
		width: 100%;
		text-align: right;
	}
	.details-link span {
		margin-left: 15px;
	}
	.attribute-divider {
		height: 1px;
		background: #d6c9a644;
		margin: 20px 0;
	}
	.constellation-summary {
		display: flex;
		justify-content: space-between;
		color: #e9dcb7;
		font-size: 18px;
		margin-bottom: 22px;
	}
	.character-description {
		font-size: 14px;
		line-height: 1.7;
		color: #dbd6cc;
	}
	.game-button {
		position: relative;
		background: #ece5d4;
		color: #3f4656;
		border: 2px solid #ece5d4;
		box-shadow: 0 1px 3px #0005;
		border-radius: 24px;
		padding: 10px 25px;
		min-height: 43px;
		font-size: 17px;
		text-align: center;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 13px;
		cursor: pointer;
	}
	.game-button:before {
		content: '●';
		font-size: 15px;
		color: #b9a365;
		line-height: 1;
	}
	.game-button:hover:not(:disabled) {
		border-color: #fff6d0;
		box-shadow: 0 0 0 2px #d5c9a366, 0 0 12px #fff3c322;
	}
	.game-button.secondary {
		background: #4a5260;
		color: #ece5d4;
		border-color: #4a5260;
	}
	.build-button {
		margin-top: 30px;
		min-width: 190px;
	}
	.weapon-stage {
		position: absolute;
		left: 20%;
		right: 40%;
		top: 14%;
		bottom: 17%;
		display: flex;
		justify-content: center;
		align-items: center;
		pointer-events: none;
	}
	.weapon-stage > img {
		position: relative;
		z-index: 1;
		width: 100%;
		height: 100%;
		object-fit: contain;
		filter: drop-shadow(0 7px 17px #0007);
		transform: rotate(-9deg);
	}
	.weapon-halo {
		position: absolute;
		inset: 10% -5%;
		background: radial-gradient(ellipse, rgba(var(--light), 0.2), transparent 65%);
	}
	.weapon-reflection {
		position: absolute;
		left: 0;
		right: 0;
		top: 92%;
		height: 45%;
		overflow: hidden;
		opacity: 0.12;
		mask-image: linear-gradient(#000, transparent 90%);
	}
	.weapon-reflection img {
		width: 100%;
		height: 220%;
		object-fit: contain;
		transform: scaleY(-1) rotate(-9deg);
		transform-origin: 50% 0;
	}
	.weapon-info .weapon-base-stats > div {
		display: flex;
		justify-content: space-between;
		margin: 16px 0;
	}
	.weapon-base-stats strong {
		font-weight: 400;
		font-size: 22px;
	}
	.weapon-base-stats {
		margin-top: 28px;
	}
	.weapon-info .rarity-stars {
		margin: 20px 0 12px;
	}
	.level-pill {
		display: inline-block;
		padding: 4px 14px;
		background: #fff1;
		font-size: 18px;
		margin-bottom: 20px;
		border-radius: 4px;
	}
	.gold-label {
		color: #e2cb97;
		margin-bottom: 8px;
	}
	.passive-copy {
		font-size: 15px;
		color: #ddd7d0;
	}
	.bottom-actions {
		display: flex;
		gap: 15px;
		margin-top: 35px;
		flex-wrap: wrap;
	}
	.empty-weapon {
		font-size: 130px;
		opacity: 0.25;
	}
	.constellation-stage {
		position: absolute;
		left: 20%;
		right: 30%;
		top: 11%;
		bottom: 10%;
		display: grid;
		place-items: center;
	}
	.constellation-diagram {
		height: 100%;
		width: 100%;
		object-fit: contain;
		mix-blend-mode: screen;
		mask-image: radial-gradient(ellipse closest-side, #000 55%, transparent 100%);
		filter: saturate(0.9);
		opacity: 0.95;
	}
	.constellation-caption {
		position: absolute;
		bottom: 0;
		text-align: center;
		color: #d7d0bd;
		font-size: 13px;
		letter-spacing: 0.08em;
	}
	.constellation-caption small {
		display: block;
		margin-top: 7px;
		letter-spacing: 0.03em;
		color: #e3ca95;
	}
	.fallback-diagram {
		width: 100%;
		height: 90%;
		overflow: visible;
		filter: drop-shadow(0 0 12px rgba(var(--light), 0.9));
	}
	.fallback-diagram path {
		fill: none;
		stroke: rgba(var(--light), 0.7);
		stroke-width: 2;
	}
	.fallback-diagram circle {
		fill: #b1b5b8;
		filter: drop-shadow(0 0 5px #fff);
		opacity: 0.5;
	}
	.fallback-diagram circle.lit {
		fill: #fff9cf;
		opacity: 1;
	}
	.constellation-list {
		position: absolute;
		right: 5%;
		top: 23%;
		bottom: 21%;
		width: 26%;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 12px;
	}
	.constellation-list button {
		position: relative;
		display: flex;
		gap: 18px;
		align-items: center;
		text-align: left;
		color: #bebbb7;
		font-size: 16px;
		padding: 0;
		border: 1px solid transparent;
		border-radius: 35px;
	}
	.constellation-list button:nth-child(2),
	.constellation-list button:nth-child(5) {
		margin-left: 22px;
	}
	.constellation-list button:nth-child(3),
	.constellation-list button:nth-child(4) {
		margin-left: 40px;
	}
	.constellation-list button:after {
		content: '';
		position: absolute;
		top: 54px;
		left: 25px;
		width: 1px;
		height: 23px;
		background: linear-gradient(#ddd7bd44, transparent);
	}
	.constellation-list button:last-child:after {
		display: none;
	}
	.constellation-list .unlocked {
		color: #ece2cb;
	}
	.constellation-list button > span:last-child {
		flex: 1;
	}
	.constellation-list small {
		display: block;
		font-size: 11px;
		margin-top: 4px;
		color: #d8c795;
	}
	.constellation-medallion {
		position: relative;
		display: grid;
		place-items: center;
		width: 54px;
		height: 54px;
		border: 1px solid #cabd9855;
		border-radius: 50%;
		background: #101523aa;
		flex-shrink: 0;
		box-shadow: 0 0 0 4px #0e132344;
	}
	.constellation-medallion img {
		width: 75%;
		height: 75%;
		object-fit: contain;
		opacity: 0.25;
	}
	.unlocked .constellation-medallion {
		background: rgba(var(--tone), 0.75);
		border-color: #e5c9a2aa;
		box-shadow: 0 0 0 3px rgba(var(--light), 0.3), 0 0 19px rgba(var(--light), 0.35);
	}
	.unlocked .constellation-medallion img {
		opacity: 1;
	}
	.ready .constellation-medallion {
		border-color: #f8e7ab;
		box-shadow: 0 0 16px #f5d58944;
	}
	.lock-symbol {
		position: absolute;
		inset: 18px;
		width: 18px;
		height: 18px;
		fill: #e3e1da;
		stroke: #e3e1da;
		stroke-width: 2;
	}
	.material-count {
		position: absolute;
		right: 5%;
		bottom: 13%;
		display: flex;
		align-items: center;
		gap: 12px;
		color: #e3d3aa;
		font-size: 14px;
	}
	.material-count img {
		width: 36px;
		height: 36px;
		object-fit: contain;
	}
	.talent-list {
		overflow-y: auto;
		scrollbar-width: thin;
		position: absolute;
		right: 5%;
		top: 18%;
		bottom: 17%;
		width: 29%;
		display: flex;
		flex-direction: column;
		justify-content: space-around;
		gap: 13px;
	}
	.talent-list > button {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		gap: 18px;
		text-align: left;
		padding: 3px 0;
		font-size: 16px;
	}
	.talent-list > button > span:last-child {
		flex: 1;
	}
	.talent-list small {
		display: block;
		margin-top: 6px;
		font-size: 14px;
		color: #f3e8ca;
	}
	.talent-list > p {
		font-size: 13px;
		text-align: center;
		color: #c6c1b8;
		margin-top: 15px;
	}
	.talent-medallion {
		height: 55px;
		width: 55px;
		border-radius: 50%;
		background: rgba(var(--light), 0.12);
		border: 1px solid #e1dbc655;
		display: grid;
		place-items: center;
		flex-shrink: 0;
	}
	.talent-medallion img {
		width: 78%;
		height: 78%;
		object-fit: contain;
	}
	.talent-list .selected .talent-medallion {
		border-color: #fce7b2;
		box-shadow: 0 0 12px #e3e0c733;
	}
	.copy-selector {
		position: absolute;
		left: 5%;
		bottom: 19%;
		width: 190px;
		z-index: 5;
	}
	.copy-selector label {
		display: flex;
		flex-direction: column;
		gap: 10px;
		font-size: 13px;
		color: #d9c9a2;
	}
	.copy-selector select {
		border: 1px solid #d8d0b966;
		background: #30334b;
		color: #f0e8d7;
		border-radius: 4px;
		padding: 8px;
		width: 100%;
	}
	.refinement-info {
		width: 35%;
		max-width: 520px;
		top: 13%;
		bottom: 10%;
		display: flex;
		flex-direction: column;
		text-align: center;
	}
	.refinement-info > h1 {
		text-align: center;
	}
	.ornament {
		position: relative;
		display: flex;
		align-items: center;
		gap: 12px;
		justify-content: center;
		font-size: 12px;
		opacity: 0.6;
		margin: 10px 0 16px;
		color: #d5c8a4;
	}
	.ornament:before,
	.ornament:after {
		content: '';
		height: 1px;
		flex: 1;
		background: linear-gradient(90deg, transparent, #d5c8a488);
	}
	.ornament:after {
		transform: scaleX(-1);
	}
	.rank-comparison {
		flex: 1 1 auto;
		min-height: 110px;
		text-align: left;
		margin: 15px 0;
		overflow: auto;
		font-size: 15px;
	}
	.rank-comparison p {
		margin-bottom: 17px;
	}
	.comparison-label {
		color: #e8d8ad;
	}
	.next-rank {
		color: #bec9d8;
	}
	.next-rank .comparison-label {
		color: #89d5d7;
	}
	.refinement-footer {
		margin-top: auto;
		flex-shrink: 0;
		padding-top: 15px;
	}
	.refinement-footer h3 {
		color: #dec89a;
		margin: 4px 0 16px;
	}
	.material-slots {
		display: flex;
		justify-content: center;
		gap: 12px;
		margin-bottom: 12px;
	}
	.material-slot,
	.empty-material {
		width: 67px;
		height: 78px;
		background: #f5efdf44 !important;
		position: relative;
		border-radius: 3px;
		display: grid;
		place-items: center;
		color: #d3cdc0;
		font-size: 36px;
	}
	.material-slot b {
		font-weight: 400;
		font-size: 42px;
		line-height: 1;
	}
	.material-slot > span {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		font-size: 13px;
		color: #4b4e59;
		background: #ede6d6;
		text-align: center;
		padding: 3px;
	}
	.material-slot img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}
	.empty-material {
		opacity: 0.25;
	}
	.refinement-footer > small {
		display: block;
		font-size: 12px;
		color: #c4bcaf;
		min-height: 30px;
	}
	.refinement-footer > .game-button {
		margin-top: 15px;
		min-width: 220px;
	}
	.toast {
		position: absolute;
		top: 100px;
		left: 35%;
		right: 30%;
		padding: 10px 18px;
		background: #172b38e8;
		color: #fff3d2;
		border-radius: 3px;
		z-index: 90;
		text-align: center;
		font-size: 14px;
		pointer-events: none;
	}
	.toast.error {
		background: #713b3bf0;
	}
	.parchment {
		background: #ede7d7;
		color: #4e5360;
		box-shadow: 5px 0 20px #0004;
		text-shadow: none;
	}
	.constellation-detail,
	.talent-detail {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 34%;
		min-width: 350px;
		max-width: 490px;
		z-index: 20;
		display: flex;
		flex-direction: column;
		padding: 33px 30px 25px;
		text-align: center;
		border-top: 7px solid rgba(var(--light), 0.8);
		border-bottom: 7px solid rgba(var(--light), 0.8);
	}
	.panel-close {
		position: absolute;
		top: 18px;
		right: 20px;
		color: #4a5261;
		font-size: 21px;
		padding: 5px;
	}
	.detail-emblem {
		display: grid;
		place-items: center;
		align-self: center;
		width: 82px;
		height: 82px;
		border: 2px solid #cdb98b;
		background: rgba(var(--tone), 0.9);
		border-radius: 50%;
		margin: 0 0 20px;
		box-shadow: 0 0 0 4px #c7b48244;
		color: #fff3cb;
		font-size: 45px;
	}
	.detail-emblem img {
		width: 76%;
		height: 76%;
		object-fit: contain;
	}
	.parchment h2 {
		color: #3f4756;
		line-height: 1.35;
	}
	.parchment .ornament {
		color: #9d8b64;
	}
	.parchment .ornament:before,
	.parchment .ornament:after {
		background: linear-gradient(90deg, transparent, #9d8b6488);
	}
	.parchment > small {
		color: #8c7a50;
		margin: 8px 0;
	}
	.panel-copy {
		flex: 1;
		min-height: 0;
		overflow: auto;
		text-align: left;
		font-size: 15px;
		line-height: 1.65;
		padding: 15px 2px;
		scrollbar-width: thin;
		scrollbar-color: #9a917b55 transparent;
	}
	.panel-copy p {
		margin: 10px 0 18px;
	}
	.subtle {
		font-size: 12px;
		color: #8b826e;
		line-height: 1.6;
	}
	.activation-footer {
		padding-top: 15px;
	}
	.cost {
		width: 70px;
		height: 80px;
		position: relative;
		margin: 0 auto 15px;
		background: #7f617b;
		border-radius: 3px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: center;
	}
	.cost img {
		width: 60px;
		height: 60px;
		object-fit: contain;
	}
	.cost span {
		display: block;
		background: #f4eedf;
		width: 100%;
		font-size: 12px;
		padding: 3px;
	}
	.activation-footer > label {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		font-size: 12px;
		margin-bottom: 16px;
	}
	.activation-footer input {
		width: 55px;
		padding: 4px;
		border: 1px solid #b3a98c;
		background: #fff9ec;
		color: #4d5360;
		text-align: center;
	}
	.activation-footer > small {
		display: block;
		margin-top: 10px;
		color: #8b7656;
	}
	.parchment .game-button {
		background: #4b5364;
		border-color: #4b5364;
		color: #ece5d3;
	}
	.parchment .game-button:before {
		color: #dfc781;
	}
	.panel-tabs {
		display: flex;
		border-bottom: 1px solid #b1a78b;
		margin: 16px -10px 0;
		font-size: 13px;
	}
	.panel-tabs button {
		flex: 1;
		color: #948772;
		padding: 13px 4px;
		position: relative;
	}
	.panel-tabs button.active {
		color: #454c5c;
	}
	.panel-tabs button.active:after {
		content: '';
		position: absolute;
		bottom: -1px;
		left: 10px;
		right: 10px;
		height: 3px;
		background: #665f52;
	}
	.skill-attributes > div {
		display: flex;
		justify-content: space-between;
		gap: 20px;
		padding: 10px 12px;
		font-size: 14px;
		line-height: 1.4;
	}
	.skill-attributes > div:nth-child(odd) {
		background: #88807114;
	}
	.skill-attributes strong {
		font-weight: 400;
		text-align: right;
	}
	.talent-level-control {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-top: 12px;
		border-top: 1px solid #c2b89e;
		padding-top: 15px;
		font-size: 13px;
	}
	.talent-level-control label {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 15px;
	}
	.talent-level-control select {
		padding: 5px 10px;
		background: #f7f1e4;
		border: 1px solid #baad8a;
		color: #4a5260;
	}
	.shade {
		position: absolute;
		inset: 0;
		background: #08132288;
		backdrop-filter: blur(7px);
		z-index: 30;
		display: grid;
		place-items: center;
	}
	.stats-detail,
	.settings-detail {
		width: min(720px, 85vw);
		max-height: 85vh;
		border-radius: 8px;
		border: 4px solid #d7cdb3;
		display: flex;
		flex-direction: column;
		padding: 24px 30px;
	}
	.modal-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		padding-bottom: 16px;
		border-bottom: 1px solid #b8ad9244;
	}
	.modal-heading button {
		font-size: 22px;
		color: inherit;
	}
	.stats-detail .panel-copy h3 {
		margin: 20px 12px 10px;
		color: #9b8354;
	}
	.settings-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 15px;
	}
	.settings-grid label {
		display: flex;
		flex-direction: column;
		gap: 7px;
		font-size: 13px;
	}
	.settings-grid input,
	.settings-grid select,
	.settings-detail select {
		width: 100%;
		padding: 8px 10px;
		background: #f9f5eb;
		color: #4b5364;
		border: 1px solid #bdb49d;
		border-radius: 3px;
	}
	.check {
		display: flex !important;
		align-items: center;
		flex-direction: row !important;
		gap: 10px;
		margin: 10px 0;
		font-size: 13px;
	}
	.check input {
		width: 17px;
		height: 17px;
		accent-color: #8e7a55;
	}
	.settings-detail details {
		border-bottom: 1px solid #bfb59b66;
		padding: 14px 0;
	}
	.settings-detail summary {
		cursor: pointer;
		color: #726349;
	}
	.settings-detail details .settings-grid {
		margin-top: 15px;
	}
	.settings-detail .panel-copy > label {
		display: flex;
		gap: 12px;
		align-items: center;
		font-size: 13px;
	}
	.table-scroll {
		overflow-x: auto;
	}
	table {
		font-size: 12px;
		width: 100%;
		border-collapse: collapse;
	}
	th,
	td {
		text-align: left;
		padding: 10px 7px;
		border-bottom: 1px solid #d1c7b0;
	}
	th {
		color: #9b8051;
	}
	td:nth-child(n + 2) {
		white-space: nowrap;
	}
	.equipment-screen {
		position: absolute;
		inset: 0;
		z-index: 35;
		background: radial-gradient(ellipse at 50% 130%, rgba(var(--light), 0.65), #17212c 100%),
			#17212c;
		display: flex;
		flex-direction: column;
	}
	.equipment-screen > header {
		height: 90px;
		padding: 25px 5%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid #dacba644;
	}
	.equipment-screen > header button {
		font-size: 23px;
	}
	.equipment-layout {
		flex: 1;
		min-height: 0;
		display: grid;
		grid-template-columns: minmax(0, 1fr) 31%;
	}
	.equipment-inventory {
		min-width: 0;
		overflow: auto;
		padding: 25px 4% 50px;
	}
	.equipment-filter {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 25px;
		color: #e5d5a8;
	}
	.equipment-grid,
	.material-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
		gap: 17px;
	}
	.weapon-card {
		position: relative;
		height: 170px;
		border-radius: 5px !important;
		overflow: hidden;
		padding: 0;
		box-shadow: 0 2px 3px #0003;
		outline: 2px solid transparent;
		outline-offset: 3px;
		max-width: 155px;
		text-align: center;
	}
	.weapon-card.star5 {
		background: linear-gradient(140deg, #835d49, #d0985a) !important;
	}
	.weapon-card.star4 {
		background: linear-gradient(140deg, #605780, #9479ac) !important;
	}
	.weapon-card.star3 {
		background: linear-gradient(140deg, #46687d, #6aa2ae) !important;
	}
	.weapon-card.selected {
		outline-color: #ffedba;
	}
	.weapon-card > img {
		width: 100%;
		height: 117px;
		object-fit: contain;
	}
	.copy-rank {
		position: absolute;
		top: 4px;
		left: 5px;
		color: #fff0c6;
		font-size: 12px;
		background: #0003;
		padding: 2px 6px;
		border-radius: 3px;
	}
	.card-rarity {
		position: absolute;
		bottom: 55px;
		left: 0;
		right: 0;
		letter-spacing: 1px;
		color: #ffdc80;
		font-size: 13px;
		text-shadow: 0 0 4px #806231;
	}
	.card-caption {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		background: #eee7d6;
		color: #48515e;
		padding: 8px 4px;
		font-size: 11px;
		min-height: 48px;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}
	.card-caption small {
		font-size: 10px;
		margin-top: 4px;
		color: #8a7758;
	}
	.equipped-tag {
		position: absolute;
		top: 30px;
		right: 0;
		background: #e3d6a4;
		color: #554b3b;
		font-size: 9px;
		padding: 3px 5px;
	}
	.equipment-preview {
		overflow: auto;
		border-left: 1px solid #dacba644;
		padding: 30px 12% 45px;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}
	.equipment-preview h1 {
		font-size: 26px;
	}
	.equipment-preview p {
		font-size: 14px;
	}
	.preview-weapon {
		width: 100%;
		height: 200px;
		object-fit: contain;
		margin: 20px 0;
	}
	.equipment-preview .game-button {
		margin-top: 25px;
		min-width: 150px;
	}
	.material-drawer {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		z-index: 35;
		width: 36%;
		min-width: 350px;
		max-width: 520px;
		padding: 25px;
		display: flex;
		flex-direction: column;
	}
	.material-grid {
		margin-top: 20px;
		overflow: auto;
		align-content: start;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 13px;
	}
	.material-drawer > p {
		margin-top: 15px;
	}
	.material-grid .weapon-card {
		height: 153px;
	}
	.material-grid .weapon-card img {
		height: 103px;
	}
	.unavailable {
		color: #e1c9b2;
		margin-top: 25px;
	}
	.scaled-effect {
		color: #947137;
	}
	@media (min-width: 1700px) {
		.menu-navigation {
			top: 20%;
		}
		.right-panel {
			top: 19%;
			right: 7%;
			font-size: 18px;
		}
		.character-stage {
			left: 15%;
			right: 27%;
		}
		.constellation-list {
			right: 7%;
			width: 23%;
		}
		.refinement-info {
			width: 32%;
		}
		.constellation-detail,
		.talent-detail {
			max-width: 560px;
			padding: 45px;
		}
		.panel-copy {
			font-size: 17px;
		}
		.menu-header {
			height: 115px;
		}
		.portrait-strip > button {
			width: 62px;
			height: 62px;
		}
		.menu-navigation button {
			font-size: 25px;
		}
		.menu-navigation .active {
			font-size: 29px;
		}
	}
	@media (max-width: 1050px) {
		.menu-header {
			padding: 18px 3%;
			gap: 15px;
			height: 85px;
		}
		.identity {
			min-width: 185px;
			font-size: 13px;
			gap: 8px;
		}
		.vision-symbol {
			font-size: 28px;
			width: 40px;
		}
		.portrait-strip {
			max-width: calc(100% - 250px);
			gap: 9px;
		}
		.portrait-strip > button {
			width: 42px;
			height: 42px;
		}
		.menu-navigation {
			left: 3%;
			top: 19%;
			gap: 16px;
			max-width: 150px;
		}
		.menu-navigation button {
			font-size: 17px;
			gap: 8px;
		}
		.menu-navigation .active {
			font-size: 19px;
		}
		.nav-diamond {
			font-size: 8px;
		}
		.menu-navigation .active .nav-diamond {
			font-size: 13px;
		}
		.right-panel {
			right: 4%;
			width: 29%;
			top: 17%;
			bottom: 14%;
		}
		.right-panel h1 {
			font-size: 25px;
		}
		.character-stage {
			left: 15%;
			right: 27%;
		}
		.character-description {
			font-size: 12px;
		}
		.attribute-list > div {
			font-size: 14px;
			padding: 8px 4px;
		}
		.attribute-list i {
			width: 16px;
			margin-right: 5px;
		}
		.character-level {
			font-size: 16px;
		}
		.attribute-divider {
			margin: 15px 0;
		}
		.constellation-summary {
			font-size: 15px;
		}
		.build-button {
			font-size: 14px;
			min-width: 0;
			margin-top: 20px;
		}
		.constellation-list {
			right: 3%;
			width: 29%;
			top: 21%;
			bottom: 22%;
		}
		.constellation-list button {
			gap: 10px;
			font-size: 13px;
		}
		.constellation-medallion {
			width: 45px;
			height: 45px;
		}
		.constellation-list button:nth-child(2),
		.constellation-list button:nth-child(5) {
			margin-left: 12px;
		}
		.constellation-list button:nth-child(3),
		.constellation-list button:nth-child(4) {
			margin-left: 23px;
		}
		.constellation-stage {
			left: 17%;
			right: 28%;
		}
		.lock-symbol {
			inset: 14px;
		}
		.constellation-list button:after {
			top: 45px;
			left: 22px;
			height: 15px;
		}
		.material-count {
			right: 3%;
			font-size: 12px;
		}
		.talent-list {
			right: 3%;
			width: 31%;
			top: 18%;
			bottom: 16%;
		}
		.talent-list > button {
			font-size: 12px;
			gap: 10px;
		}
		.talent-medallion {
			width: 43px;
			height: 43px;
		}
		.talent-list small {
			font-size: 12px;
		}
		.talent-list > p {
			font-size: 11px;
		}
		.refinement-info {
			width: 36%;
			right: 4%;
			top: 16%;
		}
		.rank-comparison {
			font-size: 12px;
		}
		.refinement-info h2 {
			font-size: 19px;
		}
		.material-slot,
		.empty-material {
			width: 49px;
			height: 59px;
		}
		.material-slots {
			gap: 9px;
		}
		.refinement-footer h3 {
			font-size: 14px;
		}
		.refinement-footer > .game-button {
			font-size: 14px;
			min-width: 180px;
			padding: 9px 17px;
		}
		.copy-selector {
			left: 3%;
			width: 150px;
			bottom: 18%;
		}
		.copy-selector label {
			font-size: 11px;
		}
		.copy-selector select {
			font-size: 11px;
		}
		.menu-footer {
			left: 3%;
			right: 4%;
			bottom: 17px;
			font-size: 12px;
		}
		.menu-footer button > span {
			font-size: 19px;
		}
		.passive-copy {
			font-size: 12px;
		}
		.weapon-info .weapon-base-stats > div {
			font-size: 13px;
		}
		.weapon-base-stats strong {
			font-size: 18px;
		}
		.weapon-info .rarity-stars {
			font-size: 18px;
		}
		.gold-label {
			font-size: 13px;
		}
		.bottom-actions .game-button {
			font-size: 13px;
			padding: 8px 17px;
		}
		.bottom-actions {
			gap: 10px;
			margin-top: 20px;
		}
		.constellation-detail,
		.talent-detail {
			width: 40%;
			min-width: 325px;
			padding: 25px;
		}
		.detail-emblem {
			width: 60px;
			height: 60px;
			margin-bottom: 15px;
		}
		.parchment h2 {
			font-size: 20px;
		}
		.panel-copy {
			font-size: 13px;
		}
		.panel-tabs {
			font-size: 11px;
		}
		.skill-attributes > div {
			font-size: 12px;
			padding: 9px 7px;
		}
		.constellation-detail .activation-footer {
			font-size: 12px;
		}
		.equipment-layout {
			grid-template-columns: minmax(0, 1fr) 35%;
		}
		.equipment-preview {
			padding: 25px 9%;
		}
		.equipment-preview h1 {
			font-size: 22px;
		}
		.equipment-grid {
			grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
			gap: 12px;
		}
		.material-drawer {
			width: 45%;
			min-width: 320px;
		}
		.toast {
			top: 85px;
			left: 30%;
			right: 15%;
		}
	}
	@media (min-width: 601px) and (max-width: 1050px) {
		.refinement-footer {
			padding-top: 5px;
		}
		.refinement-footer .ornament {
			margin: 4px 0 8px;
		}
		.refinement-footer h3 {
			margin: 4px 0 10px;
		}
		.refinement-footer .material-slots {
			margin-bottom: 8px;
		}
		.refinement-footer > small {
			font-size: 11px;
			min-height: 20px;
		}
		.refinement-footer > .game-button {
			min-height: 36px;
			padding: 7px 17px;
			margin-top: 10px;
		}
	}

	@media (max-width: 600px) {
		.menu-header {
			height: 75px;
			padding: 12px 16px;
			gap: 8px;
		}
		.identity {
			min-width: 0;
			gap: 5px;
			font-size: 12px;
			flex: 1;
			max-width: calc(100% - 45px);
		}
		.vision-symbol {
			font-size: 25px;
			width: 32px;
			height: 35px;
		}
		.portrait-strip {
			display: none;
		}
		.leave-button {
			width: 29px;
			height: 29px;
			font-size: 17px;
		}
		.menu-navigation {
			top: 76px;
			left: 12px;
			right: 12px;
			max-width: none;
			flex-direction: row;
			justify-content: center;
			gap: 13px;
			overflow-x: auto;
		}
		.menu-navigation button {
			font-size: 12px;
			gap: 4px;
			padding: 8px 1px;
		}
		.menu-navigation .active {
			font-size: 13px;
		}
		.nav-diamond {
			font-size: 6px;
		}
		.menu-navigation .active .nav-diamond {
			font-size: 10px;
		}
		.character-stage {
			left: -15%;
			right: 10%;
			top: 16%;
			bottom: 30%;
			opacity: 0.65;
		}
		.character-stage > img {
			width: 160%;
			height: 120%;
		}
		.right-panel {
			left: 15px;
			right: 15px;
			top: 53%;
			bottom: 11%;
			width: auto;
			max-width: none;
			z-index: 2;
			background: linear-gradient(transparent, #14202e55 30%);
			padding: 12px 8px;
		}
		.attributes-info h1 {
			font-size: 25px;
		}
		.attributes-info .rarity-stars {
			position: absolute;
			right: 10px;
			top: 15px;
			margin: 0;
			font-size: 15px;
		}
		.character-description {
			display: none;
		}
		.attribute-list {
			display: grid;
			grid-template-columns: 1fr 1fr;
			column-gap: 15px;
		}
		.attribute-list > div {
			font-size: 12px;
			padding: 7px 4px;
		}
		.attribute-list > div:nth-child(odd) {
			background: #fff1;
		}
		.xp-line {
			margin: 8px 0 13px;
		}
		.character-level {
			font-size: 14px;
		}
		.attribute-divider {
			margin: 8px 0;
		}
		.constellation-summary {
			font-size: 13px;
			margin: 12px 0;
		}
		.build-button {
			margin-top: 8px;
			min-height: 36px;
			padding: 7px 20px;
			float: right;
		}
		.details-link {
			font-size: 12px;
			padding: 8px 4px;
		}
		.menu-footer {
			bottom: 12px;
			left: 20px;
			right: 20px;
			font-size: 11px;
		}
		.constellation-stage {
			top: 18%;
			bottom: 35%;
			left: 0;
			right: 0;
			opacity: 0.9;
		}
		.constellation-caption {
			bottom: 5%;
			font-size: 11px;
		}
		.constellation-list {
			top: 62%;
			bottom: 15%;
			left: 18px;
			right: 18px;
			width: auto;
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 12px;
		}
		.constellation-list button {
			margin-left: 0 !important;
			font-size: 11px;
			gap: 8px;
		}
		.constellation-medallion {
			width: 38px;
			height: 38px;
		}
		.constellation-list button:after {
			display: none;
		}
		.lock-symbol {
			inset: 10px;
		}
		.material-count {
			bottom: 10%;
			right: 18px;
			font-size: 11px;
		}
		.material-count img {
			width: 26px;
			height: 26px;
		}
		.constellation-caption small {
			font-size: 10px;
		}
		.talent-list {
			top: 20%;
			bottom: 14%;
			right: 18px;
			left: 18px;
			width: auto;
			align-items: flex-end;
		}
		.talent-list > button {
			width: 65%;
			background: linear-gradient(90deg, transparent, #142235aa);
			padding: 8px 0;
			font-size: 12px;
		}
		.talent-list > p {
			width: 65%;
			text-align: center;
		}
		.talent-list .talent-medallion {
			background: rgba(var(--tone), 0.7);
		}
		.talent-list ~ .character-stage {
			opacity: 0.5;
		}
		.weapon-stage {
			left: -3%;
			right: 13%;
			top: 18%;
			bottom: 38%;
		}
		.weapon-stage > img {
			height: 100%;
			width: 100%;
			object-fit: contain;
		}
		.weapon-info {
			top: 55%;
			bottom: 14%;
			left: 20px;
			right: 20px;
			padding: 5px 0;
		}
		.weapon-info h1 {
			font-size: 23px;
		}
		.weapon-info > p {
			font-size: 12px;
		}
		.weapon-base-stats {
			margin-top: 10px;
		}
		.weapon-info .weapon-base-stats > div {
			margin: 8px 0;
		}
		.weapon-info .rarity-stars {
			display: inline-block;
			margin: 4px 16px 10px 0;
			font-size: 16px;
		}
		.level-pill {
			font-size: 12px;
			margin: 0 0 10px;
		}
		.weapon-info h3 {
			font-size: 14px;
			margin: 7px 0;
		}
		.passive-copy {
			font-size: 11px !important;
			max-height: 80px;
			overflow: auto;
		}
		.bottom-actions {
			margin: 15px 0;
		}
		.bottom-actions .game-button {
			font-size: 12px;
			min-height: 35px;
			padding: 7px 22px;
		}
		.refinement-info {
			top: 40%;
			bottom: 10%;
			left: 18px;
			right: 18px;
			width: auto;
			overflow: auto;
			padding: 5px 0;
		}
		.refinement-info > h1 {
			font-size: 22px;
			margin-bottom: 3px;
		}
		.refinement-info > .gold-label {
			font-size: 11px;
		}
		.refinement-info > .ornament {
			margin: 5px 0;
		}
		.refinement-info > h2 {
			font-size: 16px;
		}
		.rank-comparison {
			font-size: 11px;
			margin: 10px 0;
			min-height: 90px;
			max-height: 110px;
			flex: 0 0 auto;
		}
		.rank-comparison p {
			margin: 8px 0;
		}
		.refinement-footer {
			padding-top: 5px;
		}
		.refinement-footer > .ornament {
			margin: 4px 0 8px;
		}
		.refinement-footer h3 {
			font-size: 12px;
			margin-bottom: 9px;
		}
		.material-slot,
		.empty-material {
			width: 43px;
			height: 49px;
		}
		.material-slots {
			margin-bottom: 7px;
		}
		.material-slot b {
			font-size: 30px;
		}
		.material-slot > span {
			font-size: 10px;
		}
		.refinement-footer > small {
			font-size: 10px;
			min-height: 18px;
		}
		.refinement-footer > .game-button {
			margin-top: 7px;
			min-height: 35px;
			padding: 7px 20px;
			font-size: 12px;
		}
		.refining .weapon-stage {
			top: 19%;
			bottom: 60%;
		}
		.copy-selector {
			left: 15px;
			bottom: auto;
			top: 120px;
			width: 125px;
		}
		.copy-selector select {
			background: #29253da8;
		}
		.copy-selector label {
			font-size: 10px;
			gap: 6px;
		}
		.constellation-detail,
		.talent-detail {
			left: 0;
			right: 0;
			top: 0;
			bottom: 0;
			width: 100%;
			min-width: 0;
			max-width: none;
			padding: 28px 25px 20px;
		}
		.constellation-detail .panel-copy {
			font-size: 15px;
		}
		.parchment h2 {
			font-size: 23px;
		}
		.detail-emblem {
			width: 68px;
			height: 68px;
		}
		.panel-tabs {
			font-size: 13px;
		}
		.skill-attributes > div {
			font-size: 14px;
		}
		.activation-footer .game-button {
			min-width: 220px;
		}
		.activation-footer .cost {
			margin-bottom: 10px;
		}
		.stats-detail,
		.settings-detail {
			width: 93vw;
			max-height: 90vh;
			padding: 20px 16px;
		}
		.settings-grid {
			gap: 12px;
		}
		.settings-grid label {
			font-size: 12px;
		}
		.equipment-screen > header {
			height: 75px;
			padding: 20px;
		}
		.equipment-layout {
			grid-template-columns: 1fr;
			display: flex;
			flex-direction: column;
		}
		.equipment-inventory {
			flex: 1;
			min-height: 0;
			padding: 15px 20px;
		}
		.equipment-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 13px;
		}
		.weapon-card {
			height: 145px;
		}
		.weapon-card > img {
			height: 98px;
		}
		.card-caption {
			font-size: 9px;
			min-height: 43px;
			padding: 5px 3px;
		}
		.card-caption small {
			font-size: 9px;
		}
		.card-rarity {
			bottom: 47px;
			font-size: 11px;
		}
		.equipment-filter {
			font-size: 12px;
			margin-bottom: 15px;
		}
		.equipment-filter .check {
			font-size: 11px;
		}
		.equipment-preview {
			height: 235px;
			flex-shrink: 0;
			position: relative;
			padding: 20px 20px 20px 135px;
			border-top: 1px solid #dacba644;
			border-left: 0;
			overflow: auto;
		}
		.equipment-preview .preview-weapon {
			position: absolute;
			left: 10px;
			top: 15px;
			width: 115px;
			height: 165px;
			margin: 0;
		}
		.equipment-preview h1 {
			font-size: 20px;
		}
		.equipment-preview p {
			font-size: 11px;
		}
		.equipment-preview h3 {
			font-size: 13px;
			margin: 8px 0;
		}
		.equipment-preview .game-button {
			font-size: 13px;
			margin-top: 12px;
			min-height: 36px;
		}
		.material-drawer {
			width: 100%;
			min-width: 0;
			max-width: none;
		}
		.material-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
		.toast {
			top: 115px;
			left: 18px;
			right: 18px;
			font-size: 12px;
		}
		.unavailable {
			font-size: 12px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		* {
			scroll-behavior: auto !important;
		}
	}
</style>

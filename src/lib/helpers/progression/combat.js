export const plain = (s = '') => s.replace(/<[^>]+>/g, '').replace(/\*\*/g, '');
export const fmt = (n, digits = 1) =>
	Number.isFinite(n)
		? new Intl.NumberFormat('en', { maximumFractionDigits: digits }).format(n)
		: 'Unavailable';
export function slotStrength(constellation, slot) {
	return constellation < slot ? 0 : 1 + Math.floor((constellation - slot) / 6);
}
export function parameter(values, level) {
	if (!values?.length) return null;
	const index = Math.max(0, Math.floor(level) - 1);
	return index < values.length
		? values[index]
		: values.at(-1) + (index - values.length + 1) * (values.at(-1) - values.at(-2));
}
export function talentLevel(character, constellation, key, baseLevel) {
	let bonus = 0;
	for (let i = 1; i <= 6; i++) {
		const description = character.constellations?.[`c${i}`]?.description || '';
		if (description.includes(`Level of ${character.talents?.[key]?.name}`)) {
			const amount = Number(description.match(/by (\d+)/)?.[1] || 0);
			bonus += amount * slotStrength(constellation, i);
		}
	}
	return baseLevel + bonus;
}
export function talentRows(talent, level) {
	const parameters = talent?.attributes?.parameters;
	return (talent?.attributes?.labels || []).map((label) => {
		const [name, template = ''] = label.split('|');
		const formula = template.replace(/\{(param\d+):([^}]+)\}/g, (_, key, format) => {
			const value = parameter(parameters?.[key], level);
			return value === null
				? '?'
				: format.includes('P')
				? `${fmt(value * 100, 3)}%`
				: fmt(value, 3);
		});
		return { name, formula, template, parameters, level };
	});
}
export function refinementValues(weapon, rank) {
	if (!weapon) return [];
	if (rank <= 5) return weapon[`r${rank}`]?.values || [];
	return (weapon.r5?.values || []).map((v, i) => {
		const template = plain(weapon.effectTemplateRaw || weapon.effectTemplate || '');
		const context = template.split(`{${i}}`);
		const timed =
			/(?:once every|every|cooldown|CD)[^.!]*$/i.test(context[0] || '') ||
			/s(?:\b|\.)/.test(String(v));
		const chance =
			/^\s*chance\b/i.test(context[1] || '') || /chance of[^.!]*$/i.test(context[0] || '');
		const before = [...String(weapon.r4?.values?.[i] || v).matchAll(/-?\d+(?:\.\d+)?/g)].map((x) =>
			Number(x[0])
		);
		let j = 0;
		return String(v).replace(/-?\d+(?:\.\d+)?/g, (number) => {
			const n = Number(number),
				previous = before[j++] ?? n;
			let extrapolated = n + (rank - 5) * (n - previous);
			if (timed && n < previous) extrapolated = Math.max(0.1, extrapolated);
			if (chance) extrapolated = Math.min(100, Math.max(0, extrapolated));
			return String(Number(extrapolated.toFixed(6)));
		});
	});
}
export function refinementDescription(weapon, rank) {
	if (rank <= 5) return weapon?.[`r${rank}`]?.description || 'No refinement passive.';
	const values = refinementValues(weapon, rank);
	return plain(weapon?.effectTemplateRaw || weapon?.effectTemplate || '').replace(
		/\{(\d+)\}/g,
		(_, i) => values[i] ?? '?'
	);
}
const props = {
	FIGHT_PROP_HP_PERCENT: 'hpPercent',
	FIGHT_PROP_ATTACK_PERCENT: 'atkPercent',
	FIGHT_PROP_DEFENSE_PERCENT: 'defPercent',
	FIGHT_PROP_CRITICAL: 'critRate',
	FIGHT_PROP_CRITICAL_HURT: 'critDamage',
	FIGHT_PROP_CHARGE_EFFICIENCY: 'recharge',
	FIGHT_PROP_ELEMENT_MASTERY: 'em',
	FIGHT_PROP_HEAL_ADD: 'healing',
	FIGHT_PROP_PHYSICAL_ADD_HURT: 'physical'
};
export function addProperty(stats, prop, value) {
	const key = props[prop] || (/ADD_HURT$/.test(prop || '') ? 'elemental' : null);
	if (key) stats[key] = (stats[key] || 0) + value;
}
// Recognized clauses become individually switchable conditions. Unrecognized mechanics
// remain visible in the source descriptions and are never silently guessed.
export function effectModifiers(description, strength = 1) {
	const text = plain(description),
		result = [];
	const patterns = [
		{ re: /(?:Max )?HP (?:is )?increased by ([\d.]+)%/gi, stat: 'hpPercent' },
		{ re: /ATK (?:is )?increased by ([\d.]+)%/gi, stat: 'atkPercent' },
		{ re: /DEF (?:is )?increased by ([\d.]+)%/gi, stat: 'defPercent' },
		{ re: /CRIT Rate (?:is )?increased by ([\d.]+)%/gi, stat: 'critRate' },
		{ re: /CRIT DMG (?:is )?increased by ([\d.]+)%/gi, stat: 'critDamage' },
		{ re: /(?:increases?[^.!\n]*?CRIT Rate by) ([\d.]+)%/gi, stat: 'critRate' },
		{ re: /(?:increases?[^.!\n]*?CRIT DMG by) ([\d.]+)%/gi, stat: 'critDamage' },
		{ re: /Energy Recharge (?:is )?increased by ([\d.]+)%/gi, stat: 'recharge' },
		{ re: /Elemental Mastery (?:is )?increased by ([\d.]+)/gi, stat: 'em', flat: true },
		{
			re: /(?:Pyro|Hydro|Cryo|Electro|Anemo|Geo|Dendro) DMG Bonus (?:is )?increased by ([\d.]+)%/gi,
			stat: 'elemental'
		},
		{
			re: /(?:Normal Attack|Charged Attack|Elemental Skill|Elemental Burst) DMG (?:is )?increased by ([\d.]+)%/gi,
			stat: 'damageBonus',
			scoped: true
		}
	];
	for (const pattern of patterns)
		for (const m of text.matchAll(pattern.re)) {
			const scope = pattern.scoped
				? /Normal Attack/.test(m[0])
					? 'normal'
					: /Charged Attack/.test(m[0])
					? 'charged'
					: /Elemental Skill/.test(m[0])
					? 'skill'
					: 'burst'
				: null;
			result.push({
				stat: pattern.stat,
				value: (Number(m[1]) * strength) / (pattern.flat ? 1 : 100),
				text: m[0],
				scope,
				automatic: m.index === 0 && !pattern.scoped
			});
		}
	for (const m of text.matchAll(
		/ATK Bonus based on ([\d.]+)% of (?:the wielder's |their |her |his )?Max HP/gi
	)) {
		result.push({
			stat: 'attackFromHP',
			value: (Number(m[1]) * strength) / 100,
			text: m[0],
			automatic: true
		});
	}
	for (const m of text.matchAll(/ATK Bonus is increased by an additional ([\d.]+)% of Max HP/gi)) {
		result.push({
			stat: 'attackFromHP',
			value: (Number(m[1]) * strength) / 100,
			text: m[0],
			condition: 'lowHP',
			automatic: true
		});
	}
	for (const m of text.matchAll(
		/Increases the (.+?) DMG by an amount equal to ([\d.]+)% of [^.\n]*?(Max HP|ATK|DEF)/gi
	)) {
		result.push({
			stat: m[3] === 'Max HP' ? 'hp' : m[3] === 'DEF' ? 'defense' : 'attack',
			value: (Number(m[2]) * strength) / 100,
			text: m[0],
			scope: 'named',
			target: m[1]
		});
	}
	return result;
}
export function characterStats(character, weapon, build = {}, modifiers = []) {
	const base = character?.levels?.[build.level || 90];
	if (!base) return null;
	const weaponStats = weapon?.levels?.[build.weaponLevel || 90];
	const stats = {
		hpPercent: 0,
		atkPercent: 0,
		defPercent: 0,
		critRate: 0.05,
		critDamage: 0.5,
		recharge: 1,
		em: 0,
		elemental: 0,
		physical: 0,
		healing: 0,
		damageBonus: 0
	};
	// genshin-db includes base crit in a crit ascension stat.
	const specialized =
		base.specialized -
		(character.substatType === 'FIGHT_PROP_CRITICAL'
			? 0.05
			: character.substatType === 'FIGHT_PROP_CRITICAL_HURT'
			? 0.5
			: 0);
	addProperty(stats, character.substatType, specialized);
	if (weaponStats) addProperty(stats, weapon.mainStatType, weaponStats.specialized);
	if (character.talents?.passive4?.name === 'Flawless Strategy') {
		stats.healing += 0.25;
		stats.critRate -= 1;
	}
	for (const modifier of modifiers)
		if (!modifier.scope && (!modifier.condition || build[modifier.condition]))
			stats[modifier.stat] = (stats[modifier.stat] || 0) + modifier.value;
	for (const key of [
		'hpPercent',
		'atkPercent',
		'defPercent',
		'critRate',
		'critDamage',
		'recharge',
		'elemental',
		'physical',
		'damageBonus'
	])
		stats[key] += Number(build[key] || 0) / 100;
	stats.em += Number(build.em || 0);
	stats.baseAttack = base.attack + (weaponStats?.attack || 0);
	stats.hp = base.hp * (1 + stats.hpPercent) + Number(build.flatHP || 0);
	stats.attack = stats.baseAttack * (1 + stats.atkPercent) + Number(build.flatATK || 0);
	stats.defense = base.defense * (1 + stats.defPercent) + Number(build.flatDEF || 0);
	stats.attack += stats.hp * (stats.attackFromHP || 0);
	return stats;
}

export function applyTalentState(character, original, build, constellation) {
	if (!original) return null;
	const stats = { ...original };
	for (const [key, enabled, levelKey] of [
		['combat2', build.skillActive, 'skillLevel'],
		['combat3', build.burstActive, 'burstLevel']
	]) {
		if (!enabled) continue;
		const talent = character.talents?.[key];
		const level = talentLevel(character, constellation, key, Number(build[levelKey] || 10));
		for (const label of talent?.attributes?.labels || []) {
			const m = label.match(/^ATK (?:Increase|Bonus)\|\{(param\d+):[^}]+\}\s*(Max HP|DEF)$/);
			if (m) {
				let added =
					parameter(talent.attributes.parameters[m[1]], level) *
					(m[2] === 'DEF' ? stats.defense : stats.hp);
				const cap = talent.description?.match(/cannot exceed ([\d.]+)% of (?:\w+'s )?Base ATK/i);
				if (cap) added = Math.min(added, (Number(cap[1]) / 100) * stats.baseAttack);
				stats.attack += added;
			}
		}
		if (
			/Converts?[^.\n]*?(?:attack |ATK )?DMG to|Infuses?[^.\n]*?DMG/i.test(
				talent?.description || ''
			)
		)
			stats.infused = true;
	}
	return stats;
}

export function constellationHits(character, constellation) {
	const hits = [];
	for (let i = 1; i <= 6; i++) {
		const entry = character?.constellations?.[`c${i}`],
			strength = slotStrength(constellation, i);
		if (!entry || !strength) continue;
		for (const m of plain(entry.description).matchAll(
			/deal(?:ing|s)? (?:\w+ DMG equal to )?([\d.]+)% (?:of (?:[^.\n]*?'s |their |her |his )?)?(ATK|Max HP|DEF)(?: as \w+ DMG)?/gi
		)) {
			hits.push({
				name: `C${i} · ${entry.name} DMG`,
				template: `{param1:P} ${m[2]}`,
				parameters: { param1: [(Number(m[1]) * strength) / 100] },
				level: 1
			});
		}
	}
	return hits;
}
export function resistanceMultiplier(resistance) {
	return resistance < 0
		? 1 - resistance / 2
		: resistance < 0.75
		? 1 - resistance
		: 1 / (4 * resistance + 1);
}
export function hitDamage(base, stats, build, bonus = 0) {
	const level = Number(build.level || 90),
		enemyLevel = Number(build.enemyLevel || 90);
	const defense =
		(level + 100) /
		(level +
			100 +
			(enemyLevel + 100) *
				(1 - Math.min(1, Number(build.defReduction || 0) / 100)) *
				(1 - Math.min(1, Number(build.defIgnore || 0) / 100)));
	const resistance = resistanceMultiplier(Number(build.resistance ?? 10) / 100);
	const normal = base * (1 + stats.damageBonus + bonus) * defense * resistance;
	const critRate = Math.max(0, Math.min(1, stats.critRate));
	return {
		normal,
		critical: normal * (1 + stats.critDamage),
		average: normal * (1 + critRate * stats.critDamage)
	};
}
// Single-hit formulas only. Slash-separated variants are separate rows.
export function evaluateTalentRow(row, stats, build, bonus = 0, addedDamage = 0) {
	if (
		!stats ||
		!row.template ||
		!/DMG|Charged Attack:|^Charged Attack$/.test(row.name) ||
		/Absorption|Reduction|Bonus|Increase/.test(row.name)
	)
		return [];
	return row.template
		.split('/')
		.map((variant) => {
			const replaced = variant.replace(/\{(param\d+):([^}]+)\}/g, (_, key, format) => {
				const value = parameter(row.parameters?.[key], row.level);
				if (value === null) return '?';
				return `${value}${format.includes('P') ? '%' : ''}`;
			});
			const terms = replaced.split('+');
			let base = 0;
			for (const term of terms) {
				const m = term
					.trim()
					.match(
						/^([\d.]+)(%)?(?:\s*(?:Max\s*)?(HP|DEF|ATK|Elemental Mastery))?(?:\s*[×x*]\s*([\d.]+))?\s*$/i
					);
				if (!m) return null;
				const scale =
					m[3] === 'HP'
						? stats.hp
						: m[3] === 'DEF'
						? stats.defense
						: m[3] === 'Elemental Mastery'
						? stats.em
						: stats.attack;
				base += Number(m[1]) * (m[2] ? scale : 1) * Number(m[4] || 1);
			}
			return hitDamage(base + addedDamage, stats, build, bonus);
		})
		.filter(Boolean);
}

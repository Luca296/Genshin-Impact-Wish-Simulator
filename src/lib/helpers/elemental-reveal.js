export const ELEMENT_COLORS = Object.freeze({
	anemo: '#59d9b2', cryo: '#8ce7ee', dendro: '#a7d75b',
	electro: '#b18af0', geo: '#e9b65d', hydro: '#59b9ef', pyro: '#ef895b'
});

export const REVEAL_TIMING = Object.freeze({ cue: 0, color: 700, wash: 1200, revealed: 1600 });

export const isElementalCharacter = (item) =>
	item?.type === 'character' && item.rarity === 5 && item.vision in ELEMENT_COLORS;

// Each result owns one timeline. Canceling invalidates even an already queued
// callback, so skipping or advancing cannot reveal the following item early.
export function createRevealTimeline({ onPhase, onCue, schedule = setTimeout, unschedule = clearTimeout }) {
	let handles = [], generation = 0, active = false, sounded = false;
	const cancel = () => {
		generation++;
		active = false;
		handles.forEach(unschedule);
		handles = [];
	};
	const cue = () => { if (!sounded) { sounded = true; onCue(false); } };
	return {
		start() {
			cancel(); active = true; sounded = false;
			const token = generation;
			onPhase('silhouette');
			for (const [phase, delay] of Object.entries(REVEAL_TIMING)) {
				handles.push(schedule(() => {
					if (!active || token !== generation) return;
					if (phase === 'cue') return cue();
					onPhase(phase);
					if (phase === 'revealed') active = false;
				}, delay));
			}
		},
		finish() {
			if (!active) return;
			cancel();
			if (!sounded) onCue(true);
			onPhase('revealed');
		},
		cancel
	};
}

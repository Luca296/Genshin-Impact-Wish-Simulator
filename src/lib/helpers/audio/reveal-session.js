// Scope fades and stops to playback IDs. A retired result must never stop the
// following result's sound, and fast-forward must never restart an active cue.
export function createRevealAudio({ bed, impact, isMuted, schedule = setTimeout }) {
	let bedId, impactId;
	const retire = (sound, id, duration = 180) => {
		if (id === undefined) return;
		sound.fade(sound.volume(id), 0, duration, id);
		schedule(() => sound.stop(id), duration + 20);
	};
	return {
		startBed() {
			if (isMuted() || bedId !== undefined) return;
			bedId = bed.play();
			bed.seek(10, bedId);
			bed.volume(0, bedId);
			bed.fade(0, .55, 450, bedId);
		},
		cue(immediate = false) {
			if (isMuted() || impactId !== undefined) return;
			impactId = impact.play();
			if (immediate) impact.seek(1.2, impactId);
			if (bedId !== undefined) bed.fade(bed.volume(bedId), .34, 650, bedId);
		},
		cancel({ keepBed = false } = {}) {
			retire(impact, impactId);
			impactId = undefined;
			if (!keepBed) { retire(bed, bedId, 250); bedId = undefined; }
		}
	};
}

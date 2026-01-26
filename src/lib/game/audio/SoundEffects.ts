/**
 * Procedural sound effects using Web Audio API
 * No external audio files needed!
 */

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
	if (!audioContext) {
		audioContext = new AudioContext();
	}
	return audioContext;
}

/**
 * Resume audio context (required after user interaction)
 */
export function resumeAudio(): void {
	const ctx = getAudioContext();
	if (ctx.state === 'suspended') {
		ctx.resume();
	}
}

/**
 * Kick/boot sound - short percussive thwack
 */
export function playKickSound(): void {
	const ctx = getAudioContext();
	const now = ctx.currentTime;

	// Create oscillator for the "thwack"
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();

	osc.connect(gain);
	gain.connect(ctx.destination);

	// Low frequency punch
	osc.frequency.setValueAtTime(150, now);
	osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);

	// Quick attack, fast decay
	gain.gain.setValueAtTime(0.4, now);
	gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

	osc.start(now);
	osc.stop(now + 0.1);

	// Add noise burst for impact
	const bufferSize = ctx.sampleRate * 0.05;
	const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
	const data = noiseBuffer.getChannelData(0);
	for (let i = 0; i < bufferSize; i++) {
		data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
	}

	const noise = ctx.createBufferSource();
	const noiseGain = ctx.createGain();
	const noiseFilter = ctx.createBiquadFilter();

	noise.buffer = noiseBuffer;
	noiseFilter.type = 'lowpass';
	noiseFilter.frequency.value = 1000;

	noise.connect(noiseFilter);
	noiseFilter.connect(noiseGain);
	noiseGain.connect(ctx.destination);

	noiseGain.gain.setValueAtTime(0.3, now);
	noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

	noise.start(now);
}

/**
 * Goal celebration sound - triumphant fanfare
 */
export function playGoalSound(): void {
	const ctx = getAudioContext();
	const now = ctx.currentTime;

	// Play a quick ascending arpeggio
	const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
	const noteDuration = 0.12;

	notes.forEach((freq, i) => {
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.type = 'square';
		osc.frequency.value = freq;

		const startTime = now + i * noteDuration;
		gain.gain.setValueAtTime(0, startTime);
		gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
		gain.gain.setValueAtTime(0.2, startTime + noteDuration - 0.02);
		gain.gain.linearRampToValueAtTime(0, startTime + noteDuration);

		osc.start(startTime);
		osc.stop(startTime + noteDuration);
	});

	// Final sustained note
	const finalOsc = ctx.createOscillator();
	const finalGain = ctx.createGain();

	finalOsc.connect(finalGain);
	finalGain.connect(ctx.destination);

	finalOsc.type = 'square';
	finalOsc.frequency.value = 1046.50; // C6

	const finalStart = now + notes.length * noteDuration;
	finalGain.gain.setValueAtTime(0, finalStart);
	finalGain.gain.linearRampToValueAtTime(0.25, finalStart + 0.02);
	finalGain.gain.setValueAtTime(0.25, finalStart + 0.3);
	finalGain.gain.exponentialRampToValueAtTime(0.01, finalStart + 0.6);

	finalOsc.start(finalStart);
	finalOsc.stop(finalStart + 0.6);
}

/**
 * Whistle sound - referee whistle
 */
export function playWhistleSound(duration: 'short' | 'long' = 'short'): void {
	const ctx = getAudioContext();
	const now = ctx.currentTime;

	const length = duration === 'short' ? 0.3 : 0.8;

	// Main whistle tone
	const osc1 = ctx.createOscillator();
	const osc2 = ctx.createOscillator();
	const gain = ctx.createGain();

	osc1.connect(gain);
	osc2.connect(gain);
	gain.connect(ctx.destination);

	// Two slightly detuned oscillators for richer sound
	osc1.type = 'sine';
	osc2.type = 'sine';
	osc1.frequency.value = 2800;
	osc2.frequency.value = 2850;

	// Add slight vibrato
	const vibrato = ctx.createOscillator();
	const vibratoGain = ctx.createGain();
	vibrato.connect(vibratoGain);
	vibratoGain.connect(osc1.frequency);
	vibratoGain.connect(osc2.frequency);
	vibrato.frequency.value = 6;
	vibratoGain.gain.value = 30;

	gain.gain.setValueAtTime(0, now);
	gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
	gain.gain.setValueAtTime(0.15, now + length - 0.05);
	gain.gain.linearRampToValueAtTime(0, now + length);

	vibrato.start(now);
	osc1.start(now);
	osc2.start(now);

	vibrato.stop(now + length);
	osc1.stop(now + length);
	osc2.stop(now + length);
}

/**
 * Pass sound - softer kick
 */
export function playPassSound(): void {
	const ctx = getAudioContext();
	const now = ctx.currentTime;

	const osc = ctx.createOscillator();
	const gain = ctx.createGain();

	osc.connect(gain);
	gain.connect(ctx.destination);

	osc.frequency.setValueAtTime(200, now);
	osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

	gain.gain.setValueAtTime(0.2, now);
	gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

	osc.start(now);
	osc.stop(now + 0.08);
}

/**
 * Bounce sound - ball hitting post or wall
 */
export function playBounceSound(): void {
	const ctx = getAudioContext();
	const now = ctx.currentTime;

	const osc = ctx.createOscillator();
	const gain = ctx.createGain();

	osc.connect(gain);
	gain.connect(ctx.destination);

	osc.frequency.setValueAtTime(400, now);
	osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);

	gain.gain.setValueAtTime(0.25, now);
	gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

	osc.start(now);
	osc.stop(now + 0.15);
}

/**
 * Crowd cheer - noise-based crowd sound
 */
export function playCrowdCheer(): void {
	const ctx = getAudioContext();
	const now = ctx.currentTime;

	// Create pink noise for crowd
	const bufferSize = ctx.sampleRate * 1.5;
	const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
	const data = noiseBuffer.getChannelData(0);

	// Generate noise with envelope
	for (let i = 0; i < bufferSize; i++) {
		const t = i / bufferSize;
		const envelope = Math.sin(t * Math.PI); // Swell and fade
		data[i] = (Math.random() * 2 - 1) * envelope * 0.5;
	}

	const noise = ctx.createBufferSource();
	const filter = ctx.createBiquadFilter();
	const gain = ctx.createGain();

	noise.buffer = noiseBuffer;
	filter.type = 'bandpass';
	filter.frequency.value = 800;
	filter.Q.value = 0.5;

	noise.connect(filter);
	filter.connect(gain);
	gain.connect(ctx.destination);

	gain.gain.value = 0.3;

	noise.start(now);
}

/**
 * Player reveal sound - magical discovery chime
 */
export function playRevealSound(): void {
	const ctx = getAudioContext();
	const now = ctx.currentTime;

	// Magical ascending arpeggio with shimmer
	const notes = [392, 523.25, 659.25, 783.99, 1046.50]; // G4, C5, E5, G5, C6
	const noteDuration = 0.15;

	notes.forEach((freq, i) => {
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.type = 'sine';
		osc.frequency.value = freq;

		const startTime = now + i * noteDuration * 0.7; // Overlapping notes
		gain.gain.setValueAtTime(0, startTime);
		gain.gain.linearRampToValueAtTime(0.15, startTime + 0.03);
		gain.gain.exponentialRampToValueAtTime(0.01, startTime + noteDuration * 1.5);

		osc.start(startTime);
		osc.stop(startTime + noteDuration * 1.5);
	});

	// Add a shimmer/sparkle overlay
	setTimeout(() => {
		const shimmerCtx = getAudioContext();
		const shimmerNow = shimmerCtx.currentTime;

		for (let i = 0; i < 5; i++) {
			const osc = shimmerCtx.createOscillator();
			const gain = shimmerCtx.createGain();

			osc.connect(gain);
			gain.connect(shimmerCtx.destination);

			osc.type = 'sine';
			osc.frequency.value = 2000 + Math.random() * 2000;

			const startTime = shimmerNow + i * 0.08;
			gain.gain.setValueAtTime(0, startTime);
			gain.gain.linearRampToValueAtTime(0.05, startTime + 0.02);
			gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

			osc.start(startTime);
			osc.stop(startTime + 0.15);
		}
	}, 300);
}

/**
 * UI click sound - subtle feedback
 */
export function playClickSound(): void {
	const ctx = getAudioContext();
	const now = ctx.currentTime;

	const osc = ctx.createOscillator();
	const gain = ctx.createGain();

	osc.connect(gain);
	gain.connect(ctx.destination);

	osc.type = 'sine';
	osc.frequency.value = 800;

	gain.gain.setValueAtTime(0.1, now);
	gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

	osc.start(now);
	osc.stop(now + 0.05);
}

/**
 * Coin collect sound - satisfying cha-ching
 */
export function playCoinSound(): void {
	const ctx = getAudioContext();
	const now = ctx.currentTime;

	// High sparkly notes
	const notes = [1318.51, 1567.98, 2093.00]; // E6, G6, C7

	notes.forEach((freq, i) => {
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.type = 'sine';
		osc.frequency.value = freq;

		const startTime = now + i * 0.08;
		gain.gain.setValueAtTime(0, startTime);
		gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
		gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);

		osc.start(startTime);
		osc.stop(startTime + 0.2);
	});
}

<script lang="ts">
	/**
	 * Mobile touch controls overlay for the game
	 * Renders a D-pad and action buttons
	 */

	interface TouchState {
		left: boolean;
		right: boolean;
		up: boolean;
		down: boolean;
		kick: boolean;
		switch: boolean;
	}

	interface Props {
		onInput: (state: TouchState) => void;
	}

	let { onInput }: Props = $props();

	let touchState = $state<TouchState>({
		left: false,
		right: false,
		up: false,
		down: false,
		kick: false,
		switch: false
	});

	// Track active touches on dpad
	let activeDpadTouch: number | null = null;

	function updateInput() {
		onInput({ ...touchState });
	}

	// D-pad touch handling
	function handleDpadTouch(e: TouchEvent) {
		e.preventDefault();
		const dpad = e.currentTarget as HTMLElement;
		const rect = dpad.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;

		// Reset all directions first
		touchState.left = false;
		touchState.right = false;
		touchState.up = false;
		touchState.down = false;

		// Find active touch on dpad
		for (let i = 0; i < e.touches.length; i++) {
			const touch = e.touches[i];
			// Check if this touch is within dpad bounds
			if (
				touch.clientX >= rect.left &&
				touch.clientX <= rect.right &&
				touch.clientY >= rect.top &&
				touch.clientY <= rect.bottom
			) {
				const dx = touch.clientX - centerX;
				const dy = touch.clientY - centerY;
				const deadzone = 15;

				if (Math.abs(dx) > deadzone || Math.abs(dy) > deadzone) {
					// Determine direction based on angle
					const angle = Math.atan2(dy, dx);
					const deg = (angle * 180) / Math.PI;

					// 8-way direction detection
					if (deg >= -22.5 && deg < 22.5) touchState.right = true;
					else if (deg >= 22.5 && deg < 67.5) {
						touchState.right = true;
						touchState.down = true;
					} else if (deg >= 67.5 && deg < 112.5) touchState.down = true;
					else if (deg >= 112.5 && deg < 157.5) {
						touchState.left = true;
						touchState.down = true;
					} else if (deg >= 157.5 || deg < -157.5) touchState.left = true;
					else if (deg >= -157.5 && deg < -112.5) {
						touchState.left = true;
						touchState.up = true;
					} else if (deg >= -112.5 && deg < -67.5) touchState.up = true;
					else if (deg >= -67.5 && deg < -22.5) {
						touchState.right = true;
						touchState.up = true;
					}
				}
				break;
			}
		}

		updateInput();
	}

	function handleDpadEnd(e: TouchEvent) {
		e.preventDefault();
		const dpad = e.currentTarget as HTMLElement;
		const rect = dpad.getBoundingClientRect();

		// Check if any remaining touch is on the dpad
		let hasDpadTouch = false;
		for (let i = 0; i < e.touches.length; i++) {
			const touch = e.touches[i];
			if (
				touch.clientX >= rect.left &&
				touch.clientX <= rect.right &&
				touch.clientY >= rect.top &&
				touch.clientY <= rect.bottom
			) {
				hasDpadTouch = true;
				break;
			}
		}

		if (!hasDpadTouch) {
			touchState.left = false;
			touchState.right = false;
			touchState.up = false;
			touchState.down = false;
			updateInput();
		}
	}

	// Button handlers
	function handleKickStart(e: TouchEvent | MouseEvent) {
		e.preventDefault();
		touchState.kick = true;
		updateInput();
	}

	function handleKickEnd(e: TouchEvent | MouseEvent) {
		e.preventDefault();
		touchState.kick = false;
		updateInput();
	}

	function handleSwitchStart(e: TouchEvent | MouseEvent) {
		e.preventDefault();
		touchState.switch = true;
		updateInput();
	}

	function handleSwitchEnd(e: TouchEvent | MouseEvent) {
		e.preventDefault();
		touchState.switch = false;
		updateInput();
	}
</script>

<div class="touch-controls">
	<!-- D-Pad (left side) -->
	<div
		class="dpad"
		ontouchstart={handleDpadTouch}
		ontouchmove={handleDpadTouch}
		ontouchend={handleDpadEnd}
		ontouchcancel={handleDpadEnd}
	>
		<div class="dpad-inner">
			<div class="dpad-up {touchState.up ? 'active' : ''}">
				<svg viewBox="0 0 24 24" fill="currentColor">
					<path d="M12 4l-8 8h16z" />
				</svg>
			</div>
			<div class="dpad-horizontal">
				<div class="dpad-left {touchState.left ? 'active' : ''}">
					<svg viewBox="0 0 24 24" fill="currentColor">
						<path d="M4 12l8-8v16z" />
					</svg>
				</div>
				<div class="dpad-center"></div>
				<div class="dpad-right {touchState.right ? 'active' : ''}">
					<svg viewBox="0 0 24 24" fill="currentColor">
						<path d="M20 12l-8-8v16z" />
					</svg>
				</div>
			</div>
			<div class="dpad-down {touchState.down ? 'active' : ''}">
				<svg viewBox="0 0 24 24" fill="currentColor">
					<path d="M12 20l8-8H4z" />
				</svg>
			</div>
		</div>
	</div>

	<!-- Action buttons (right side) -->
	<div class="action-buttons">
		<button
			class="btn-switch {touchState.switch ? 'active' : ''}"
			ontouchstart={handleSwitchStart}
			ontouchend={handleSwitchEnd}
			ontouchcancel={handleSwitchEnd}
			onmousedown={handleSwitchStart}
			onmouseup={handleSwitchEnd}
			onmouseleave={handleSwitchEnd}
		>
			S
		</button>
		<button
			class="btn-kick {touchState.kick ? 'active' : ''}"
			ontouchstart={handleKickStart}
			ontouchend={handleKickEnd}
			ontouchcancel={handleKickEnd}
			onmousedown={handleKickStart}
			onmouseup={handleKickEnd}
			onmouseleave={handleKickEnd}
		>
			KICK
		</button>
	</div>
</div>

<style>
	.touch-controls {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 180px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0 20px 20px;
		pointer-events: none;
		z-index: 100;
	}

	.dpad {
		width: 140px;
		height: 140px;
		pointer-events: auto;
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
	}

	.dpad-inner {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.dpad-up,
	.dpad-down {
		width: 50px;
		height: 40px;
		background: rgba(255, 255, 255, 0.15);
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgba(255, 255, 255, 0.6);
		transition: all 0.1s;
	}

	.dpad-up {
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
	}

	.dpad-down {
		border-top-left-radius: 0;
		border-top-right-radius: 0;
	}

	.dpad-horizontal {
		display: flex;
		align-items: center;
	}

	.dpad-left,
	.dpad-right {
		width: 40px;
		height: 50px;
		background: rgba(255, 255, 255, 0.15);
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgba(255, 255, 255, 0.6);
		transition: all 0.1s;
	}

	.dpad-left {
		border-top-right-radius: 0;
		border-bottom-right-radius: 0;
	}

	.dpad-right {
		border-top-left-radius: 0;
		border-bottom-left-radius: 0;
	}

	.dpad-center {
		width: 50px;
		height: 50px;
		background: rgba(255, 255, 255, 0.1);
	}

	.dpad-up.active,
	.dpad-down.active,
	.dpad-left.active,
	.dpad-right.active {
		background: rgba(124, 58, 237, 0.6);
		color: white;
	}

	.dpad-up svg,
	.dpad-down svg,
	.dpad-left svg,
	.dpad-right svg {
		width: 20px;
		height: 20px;
	}

	.action-buttons {
		display: flex;
		flex-direction: column;
		gap: 12px;
		pointer-events: auto;
	}

	.btn-kick,
	.btn-switch {
		border: none;
		border-radius: 50%;
		font-family: var(--font-pixel, 'Press Start 2P', monospace);
		font-size: 10px;
		cursor: pointer;
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
		transition: all 0.1s;
	}

	.btn-kick {
		width: 80px;
		height: 80px;
		background: rgba(124, 58, 237, 0.7);
		color: white;
		font-size: 12px;
	}

	.btn-kick.active {
		background: rgba(124, 58, 237, 1);
		transform: scale(0.95);
		box-shadow: 0 0 20px rgba(124, 58, 237, 0.8);
	}

	.btn-switch {
		width: 50px;
		height: 50px;
		background: rgba(255, 255, 255, 0.2);
		color: white;
		align-self: flex-end;
	}

	.btn-switch.active {
		background: rgba(16, 185, 129, 0.8);
		transform: scale(0.95);
	}
</style>

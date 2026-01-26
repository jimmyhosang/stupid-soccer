import type { Player } from '$lib/types/database';

/**
 * Generate a shareable PNG image from the ShareCard component
 * Uses html2canvas to convert DOM to canvas
 */
export async function generateShareImage(element: HTMLElement): Promise<Blob> {
	// Dynamically import html2canvas
	const html2canvas = (await import('html2canvas')).default;

	const canvas = await html2canvas(element, {
		width: 1200,
		height: 630,
		scale: 2, // Higher quality
		backgroundColor: null,
		logging: false,
		useCORS: true
	});

	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) {
					resolve(blob);
				} else {
					reject(new Error('Failed to generate image'));
				}
			},
			'image/png',
			0.95
		);
	});
}

/**
 * Download the share image as a PNG file
 */
export async function downloadShareImage(element: HTMLElement, playerName: string): Promise<void> {
	const blob = await generateShareImage(element);
	const url = URL.createObjectURL(blob);

	const link = document.createElement('a');
	link.href = url;
	link.download = `${playerName.toLowerCase().replace(/\s+/g, '-')}-stupid-soccer.png`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);

	URL.revokeObjectURL(url);
}

/**
 * Share to Twitter with image
 * Note: Twitter doesn't support direct image upload from web,
 * so we share a link with text
 */
export function shareToTwitter(player: Player, shareUrl?: string): void {
	const text = `Check out my new player "${player.name}" in Stupid Soccer! ⚽🎮`;
	const url = shareUrl || 'https://stupidsoccer.gg';
	const hashtags = 'StupidSoccer,IndieGame,Gaming';

	const twitterUrl = new URL('https://twitter.com/intent/tweet');
	twitterUrl.searchParams.set('text', text);
	twitterUrl.searchParams.set('url', url);
	twitterUrl.searchParams.set('hashtags', hashtags);

	window.open(twitterUrl.toString(), '_blank', 'width=550,height=420');
}

/**
 * Copy shareable link to clipboard
 */
export async function copyShareLink(playerId: string): Promise<boolean> {
	const shareUrl = `${window.location.origin}/player/${playerId}`;

	try {
		await navigator.clipboard.writeText(shareUrl);
		return true;
	} catch {
		// Fallback for older browsers
		const textArea = document.createElement('textarea');
		textArea.value = shareUrl;
		document.body.appendChild(textArea);
		textArea.select();
		document.execCommand('copy');
		document.body.removeChild(textArea);
		return true;
	}
}

/**
 * Share using Web Share API (mobile-friendly)
 */
export async function nativeShare(player: Player, imageBlob?: Blob): Promise<boolean> {
	if (!navigator.share) {
		return false;
	}

	const shareData: ShareData = {
		title: `${player.name} - Stupid Soccer`,
		text: `Check out my player "${player.name}" in Stupid Soccer!`,
		url: `${window.location.origin}/player/${player.id}`
	};

	// If image blob provided and Web Share supports files
	if (imageBlob && navigator.canShare && navigator.canShare({ files: [new File([imageBlob], 'player.png', { type: 'image/png' })] })) {
		const file = new File([imageBlob], `${player.name}-stupid-soccer.png`, { type: 'image/png' });
		shareData.files = [file];
	}

	try {
		await navigator.share(shareData);
		return true;
	} catch {
		// User cancelled or error
		return false;
	}
}

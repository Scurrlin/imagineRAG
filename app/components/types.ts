// YouTube IFrame API types
export interface YTPlayer {
	destroy: () => void;
	getCurrentTime: () => number;
	getDuration: () => number;
}

export interface YTPlayerOptions {
	videoId: string;
	playerVars?: {
		autoplay?: number;
		modestbranding?: number;
		rel?: number;
	};
	events?: {
		onStateChange?: (event: { data: number }) => void;
	};
}

export interface YTNamespace {
	Player: new (element: HTMLElement, options: YTPlayerOptions) => YTPlayer;
}

// Extend Window interface for YouTube API
declare global {
	interface Window {
		YT: YTNamespace;
		onYouTubeIframeAPIReady: () => void;
	}
}

// Chat message type
export interface Message {
	id: string;
	role: 'user' | 'assistant';
	content: string;
}

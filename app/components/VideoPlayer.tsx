'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { YTPlayer } from './types';

interface VideoPlayerProps {
	showYouTube: boolean;
	onPlayClick: () => void;
}

export default function VideoPlayer({ showYouTube, onPlayClick }: VideoPlayerProps) {
	const [videoFadingOut, setVideoFadingOut] = useState(false);
	const [videoEnded, setVideoEnded] = useState(false);
	const youtubePlayerRef = useRef<HTMLDivElement>(null);
	const playerInstanceRef = useRef<YTPlayer | null>(null);
	const fadeOutTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const overlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Stop video 0.6 seconds before it ends
	const handleVideoTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
		const video = e.currentTarget;
		if (video.duration && video.currentTime >= video.duration - 0.6) {
			video.pause();
		}
	};

	// Handle YouTube player state change
	const onPlayerStateChange = useCallback((event: { data: number }) => {
		// PlayerState.PLAYING === 1
		if (event.data === 1 && playerInstanceRef.current) {
			const player = playerInstanceRef.current;
			const currentTime = player.getCurrentTime();
			const duration = player.getDuration();
			const timeUntilFadeOut = (duration - currentTime - 1) * 1000; // Video fades out 1s before end
			const timeUntilOverlay = (duration - currentTime - 0.5) * 1000; // Overlay fades in 0.5s before end

			// Clear existing timeouts
			if (fadeOutTimeoutRef.current) clearTimeout(fadeOutTimeoutRef.current);
			if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);

			// Set timeout for fade-out
			if (timeUntilFadeOut > 0) {
				fadeOutTimeoutRef.current = setTimeout(() => setVideoFadingOut(true), timeUntilFadeOut);
			}
			// Set timeout for overlay fade-in
			if (timeUntilOverlay > 0) {
				overlayTimeoutRef.current = setTimeout(() => setVideoEnded(true), timeUntilOverlay);
			}
		}
		// PlayerState.PAUSED === 2, PlayerState.ENDED === 0 - clear timeouts
		if (event.data === 2 || event.data === 0) {
			if (fadeOutTimeoutRef.current) {
				clearTimeout(fadeOutTimeoutRef.current);
				fadeOutTimeoutRef.current = null;
			}
			if (overlayTimeoutRef.current) {
				clearTimeout(overlayTimeoutRef.current);
				overlayTimeoutRef.current = null;
			}
		}
	}, []);

	// Initialize YouTube player when showYouTube becomes true
	useEffect(() => {
		if (!showYouTube || videoEnded) return;

		const initPlayer = () => {
			if (youtubePlayerRef.current && window.YT && window.YT.Player) {
				// Destroy existing player if any
				if (playerInstanceRef.current) {
					playerInstanceRef.current.destroy();
				}

				playerInstanceRef.current = new window.YT.Player(youtubePlayerRef.current, {
					videoId: 'fCiN0crOXtM',
					playerVars: {
						autoplay: 1,
						modestbranding: 1,
						rel: 0,
					},
					events: {
						onStateChange: onPlayerStateChange,
					},
				});
			}
		};

		// Load YouTube IFrame API if not already loaded
		if (!window.YT) {
			const tag = document.createElement('script');
			tag.src = 'https://www.youtube.com/iframe_api';
			const firstScriptTag = document.getElementsByTagName('script')[0];
			firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

			window.onYouTubeIframeAPIReady = initPlayer;
		} else {
			initPlayer();
		}

		return () => {
			if (fadeOutTimeoutRef.current) {
				clearTimeout(fadeOutTimeoutRef.current);
				fadeOutTimeoutRef.current = null;
			}
			if (overlayTimeoutRef.current) {
				clearTimeout(overlayTimeoutRef.current);
				overlayTimeoutRef.current = null;
			}
			if (playerInstanceRef.current) {
				playerInstanceRef.current.destroy();
				playerInstanceRef.current = null;
			}
		};
	}, [showYouTube, videoEnded, onPlayerStateChange]);

	// Handle replay
	const handleReplay = () => {
		setVideoFadingOut(false);
		setVideoEnded(false);
		// Player will reinitialize via useEffect
	};

	return (
		<div className="relative rounded-xl overflow-hidden shadow-lg max-w-full sm:max-w-lg mx-auto bg-black">
			{!showYouTube ? (
				<div
					onClick={onPlayClick}
					className="relative cursor-pointer group"
					aria-label="Watch Video"
				>
					{/* Mobile: Static image in video-sized container */}
					<div className="aspect-video block sm:hidden">
						<img
							src="/imagine-still.png"
							alt="ImagineSoftware"
							className="w-full h-full object-cover"
						/>
					</div>
					{/* Desktop: Video */}
					<video
						width="1920"
						height="1080"
						autoPlay
						muted
						playsInline
						onTimeUpdate={handleVideoTimeUpdate}
						className="w-full h-auto hidden sm:block"
					>
						<source
							src="https://imagineteam.com/wp-content/uploads/2025/04/ef4b-4206-b344-7937abcb4293.mp4"
							type="video/mp4"
						/>
						Your browser does not support the video tag.
					</video>
					{/* Play button overlay */}
					<div className="absolute inset-0 flex items-center justify-center bg-transparent group-hover:bg-black/30 transition-colors">
						<div className="w-16 h-16 bg-[#4B9CD3] rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
							<svg
								className="w-11 h-11 text-white"
								fill="currentColor"
								viewBox="0 0 24 24"
							>
								<path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z" />
							</svg>
						</div>
					</div>
				</div>
			) : (
				<div className="aspect-video relative">
					<div className={`w-full h-full ${videoFadingOut ? 'animate-fade-out' : ''}`}>
						<div
							ref={youtubePlayerRef}
							className="w-full h-full"
						/>
					</div>
					{/* Replay overlay - only shows when video ends */}
					{videoEnded && (
						<div className="absolute inset-0 bg-black flex items-center justify-center gap-6 p-4 animate-fade-in">
							{/* Logo on the left */}
							<div className="flex-1 flex items-center justify-center">
								<img
									src="/imagine-logo2.webp"
									alt="ImagineSoftware 25 Years"
									className="w-full max-w-[200px] h-auto rounded-xl border border-white/30"
								/>
							</div>
							{/* Replay button and link on the right */}
							<div className="flex-1 flex flex-col items-center justify-center">
								<div
									className="cursor-pointer hover:opacity-80 transition-opacity"
									onClick={handleReplay}
								>
									<svg
										className="w-16 h-16 text-white"
										fill="none"
										stroke="currentColor"
										strokeWidth={2}
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
										/>
									</svg>
								</div>
								<a
									href="https://imagineteam.com/contact-us/"
									target="_blank"
									rel="noopener noreferrer"
									className="mt-4 px-5 py-2 bg-gradient-to-r from-[#0A5A7C] to-[#4B9CD3] text-white font-semibold text-sm uppercase tracking-wide rounded-lg hover:opacity-90 transition-opacity cursor-pointer shadow-md whitespace-nowrap"
								>
									Contact Us
								</a>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

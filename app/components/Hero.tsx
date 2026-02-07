'use client';

import Image from 'next/image';
import { EXTERNAL_LINKS } from '../config';

export default function Hero() {
	return (
		<section className="hero-section relative overflow-clip">
			{/* ============================================
			    Hero Video Background — 3 different cuts
			    ============================================ */}
			{/* Desktop (>=1400px) — 1920×1080 */}
			<video
				autoPlay
				muted
				loop
				playsInline
				className="hero-video hero-video--desktop"
			>
				<source
					src="https://imagineteam.com/wp-content/uploads/2025/04/7d38-4f84-bdf3-7d0cf86f030a.mp4"
					type="video/mp4"
				/>
				<source src="/hero_video.mp4" type="video/mp4" />
			</video>

			{/* Tablet (768px – 1399px) — 1440×900 */}
			<video
				autoPlay
				muted
				loop
				playsInline
				className="hero-video hero-video--tablet"
			>
				<source
					src="https://imagineteam.com/wp-content/uploads/2025/04/a01a451ed35351beeda410753d8c051426a5f40c.mp4"
					type="video/mp4"
				/>
			</video>

			{/* Mobile (<768px) — 400×900 portrait */}
			<video
				autoPlay
				muted
				loop
				playsInline
				className="hero-video hero-video--mobile"
			>
				<source
					src="https://imagineteam.com/wp-content/uploads/2025/04/72e5d746ea84e26585d7dbfd811de04c55211488.mp4"
					type="video/mp4"
				/>
			</video>

			{/* Gradient overlays */}
			<div className="hero-overlay" />
			<div className="hero-bottom-gradient" />

			{/* ============================================
			    Hero Content Overlay
			    ============================================ */}
			<div className="relative z-10 h-full flex flex-col">
				{/* Top navigation bar */}
				<nav className="flex items-center justify-between px-6 sm:px-10 lg:px-16 py-5">
					<a
						href={EXTERNAL_LINKS.HOME_PAGE}
						target="_blank"
						rel="noopener noreferrer"
					>
						<Image
							src="/imagine_logo.svg"
							alt="ImagineSoftware"
							width={180}
							height={40}
							priority
							className="h-auto cursor-pointer hover:opacity-90 transition-opacity"
						/>
					</a>

					{/* Center title — hidden on narrow screens */}
					<h1 className="hidden md:block text-4xl xl:text-5xl font-bold text-white leading-tight animate-hero-text-delay-1">
						Digital Consultant
					</h1>

					{/* CTA button */}
					<a
						href={EXTERNAL_LINKS.CONTACT_PAGE}
						target="_blank"
						rel="noopener noreferrer"
						className="px-5 py-2.5 bg-[#4B9CD3] text-white text-sm font-semibold uppercase tracking-wider rounded-lg hover:bg-[#3A8BC2] transition-colors cursor-pointer"
					>
						Contact Us
					</a>
				</nav>

				{/* ---- 1400px+: left-aligned together ---- */}
				<div className="flex1-xxl items-center px-16 pb-24">
					<div className="max-w-lg xl:max-w-xl">
						<p className="text-[#4B9CD3] text-base font-semibold uppercase tracking-[0.2em] mb-4 animate-hero-text">
							Activate the Power of ImagineOne&reg;
						</p>

						<h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6 animate-hero-text-delay-1">
							Take a Quantum Leap in Healthcare Systems
							Technology
						</h1>
					</div>
				</div>
			</div>
		</section>
	);
}

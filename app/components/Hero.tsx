'use client';

import Image from 'next/image';
import { EXTERNAL_LINKS } from '../config';

export default function Hero({ children }: { children?: React.ReactNode }) {
	return (
		<section className="hero-section relative overflow-clip">
			<video
				autoPlay
				muted
				loop
				playsInline
				preload="auto"
				className="hero-video"
			>
				<source
					src="https://imagineteam.com/wp-content/uploads/2025/04/a01a451ed35351beeda410753d8c051426a5f40c.mp4"
					type="video/mp4"
				/>
			</video>

			<div className="hero-overlay" />
			<div className="hero-bottom-gradient" />

			<div className="relative z-10 h-full flex flex-col">
				<nav className="relative flex items-center justify-between px-6 sm:px-10 lg:px-16 py-5">
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

					<h1 className="hero-title-nav absolute left-1/2 -translate-x-1/2 text-5xl font-bold text-white leading-tight animate-hero-text">
						Digital Consultant
					</h1>

					<a
						href={EXTERNAL_LINKS.CONTACT_PAGE}
						target="_blank"
						rel="noopener noreferrer"
						className="px-5 py-2.5 bg-[#4B9CD3] text-white text-sm font-semibold uppercase tracking-wider rounded-lg hover:bg-[#3A8BC2] transition-colors cursor-pointer"
					>
						Contact Us
					</a>
				</nav>

				<div className="text-center px-6 sm:px-10 lg:px-16 pt-2">
					<h2 className="hero-title-mobile text-4xl font-bold text-white mb-3 animate-hero-text">
						Digital Consultant
					</h2>
					<p className="text-[#5BB8E8] text-xs sm:text-sm md:text-base font-semibold uppercase tracking-[0.2em] animate-hero-text-delay-1">
						Activate the Power of ImagineOne&reg;
					</p>
				</div>

				<div className="flex-1" />

				{children}
			</div>
		</section>
	);
}

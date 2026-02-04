import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
	title: 'ImagineSoftware Digital Consultant',
	description:
		'Take a Quantum Leap in Healthcare Systems Technology. AI-powered solutions for revenue cycle management, medical billing, and practice optimization.',
	metadataBase: new URL('https://imaginerag.onrender.com/'),
	keywords: [
		'healthcare technology',
		'revenue cycle management',
		'medical billing',
		'practice management',
		'healthcare software',
		'RCM solutions',
		'ImagineSoftware',
		'medical practice optimization',
		'healthcare AI',
		'billing automation',
	],
	icons: {
		icon: '/favicon.png',
	},

	// OpenGraph tags (Facebook, LinkedIn, iMessage, WhatsApp, Slack, Discord, etc.)
	openGraph: {
		title: 'ImagineSoftware Digital Consultant',
		description:
			'Take a Quantum Leap in Healthcare Systems Technology. AI-powered solutions for revenue cycle management, medical billing, and practice optimization.',
		url: 'https://imaginerag.onrender.com/',
		siteName: 'ImagineSoftware',
		images: [
			{
				url: '/imagine-preview.png',
				width: 1200,
				height: 630,
				alt: 'ImagineSoftware Digital Consultant - Healthcare Technology Solutions',
				type: 'image/png',
			},
		],
		locale: 'en_US',
		type: 'website',
	},

	// Twitter/X tags
	twitter: {
		card: 'summary_large_image',
		title: 'ImagineSoftware Digital Consultant',
		description:
			'Take a Quantum Leap in Healthcare Systems Technology. AI-powered solutions for revenue cycle management and medical billing.',
		images: ['/imagine-preview.png'],
		creator: '@ImagineSoftware',
		site: '@ImagineSoftware',
	},

	// Additional metadata
	alternates: {
		canonical: 'https://imaginerag.onrender.com/',
	},
	robots: {
		index: true,
		follow: true,
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang='en'>
			<body>
				{/* Height warning overlay - shown via CSS when height < 500px */}
				<div className='height-warning'>
					<img src='/imagine_logo.svg' alt='ImagineSoftware' width={280} height={60} />
					<p>Please increase your screen height to &gt;500px</p>
				</div>
				<main className='pt-16'>{children}</main>
			</body>
		</html>
	);
}

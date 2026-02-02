import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
	title: 'ImagineSoftware Digital Consultant',
	description: 'Take a Quantum Leap in Healthcare Systems Technology',
	icons: {
		icon: '/favicon.png',
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
				<main className='pt-16'>{children}</main>
			</body>
		</html>
	);
}

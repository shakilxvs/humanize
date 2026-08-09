import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Humanize — Write assignments that sound like you',
  description:
    'Analyze your draft, discover where your own reasoning is missing, answer targeted questions, and build a stronger version around your ideas.',
  openGraph: {
    title: 'Humanize',
    description: 'AI-assisted writing personalization and authenticity support.',
    type: 'website'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}

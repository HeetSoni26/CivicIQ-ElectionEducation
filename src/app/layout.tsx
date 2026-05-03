import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s | CivicIQ — Election Education",
    default: "CivicIQ — Election Process Education Assistant",
  },
  description:
    "Learn your country's election process, check voting eligibility, and get step-by-step guidance — beginner-friendly, accessible, and politically neutral.",
  keywords: [
    "election education",
    "voting guide",
    "civic education",
    "how to vote",
    "voter registration",
    "election process",
    "civic literacy",
    "democracy",
  ],
  authors: [{ name: "CivicIQ Team" }],
  creator: "CivicIQ",
  publisher: "CivicIQ",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    siteName: "CivicIQ",
    title: "CivicIQ — Election Process Education Assistant",
    description:
      "Understand elections, check eligibility, and participate with confidence. Free, accessible, politically neutral.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "CivicIQ — Election Education",
    description:
      "Understand elections, check eligibility, and participate with confidence.",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CivicIQ",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
        <meta httpEquiv="Permissions-Policy" content="camera=(), microphone=(self), geolocation=()" />
      </head>
      <body>
        <a href="#main-content" className="skip-nav">
          Skip to main content
        </a>
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
      </body>
    </html>
  );
}

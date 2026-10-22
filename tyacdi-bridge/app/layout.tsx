import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = "https://tyacdi-bridge-miwp.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "TYACDI BRIDGE | Learn. Build. Grow.",
    template: "%s | TYACDI BRIDGE",
  },

  description:
    "TYACDI BRIDGE connects ambitious young entrepreneurs with experienced CEOs and mentors. Build professional relationships, learn from industry leaders, and grow your future.",

  applicationName: "TYACDI BRIDGE",

  keywords: [
    "TYACDI BRIDGE",
    "CEO mentorship",
    "entrepreneurship",
    "young entrepreneurs",
    "business mentors",
    "professional networking",
    "business development",
    "entrepreneurship in Nigeria",
    "CEO network",
    "business growth",
  ],

  authors: [
    {
      name: "WEYA-AJAYI VICTOR",
    },
  ],

  creator: "WEYA-AJAYI VICTOR",

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    locale: "en_NG",
    url: siteUrl,
    siteName: "TYACDI BRIDGE",
    title: "TYACDI BRIDGE | Learn. Build. Grow.",
    description:
      "Connect with experienced CEOs, learn from mentors, build meaningful professional relationships, and grow your entrepreneurial future.",
    images: [
      {
        url: "/tyacdi-logo.png",
        width: 1536,
        height: 1024,
        alt: "TYACDI BRIDGE — Learn. Build. Grow.",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "TYACDI BRIDGE | Learn. Build. Grow.",
    description:
      "Connect with CEOs and mentors. Build your network and grow your entrepreneurial future.",
    images: ["/tyacdi-logo.png"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  verification: {
    google: "XNQiPB0hUk3TvSoLobOezsbCZ80dvB1XsiBqj8b8Y0U",
  },

  other: {
    "application-name": "TYACDI BRIDGE",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

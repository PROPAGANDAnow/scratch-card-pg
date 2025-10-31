import type { Metadata, Viewport } from "next";

import "~/app/globals.css";
import { Providers } from "~/app/providers";
import AppBootstrap from "./AppBootstrap";
import Wrapper from "~/components/wrapper";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Scratch Off",
  description: "Scratch to win big!",
  icons: {
    icon: [
      {
        rel: "icon",
        url: "/assets/splash-image.jpg",
        sizes: "any",
        type: "image/jpg",
      },
    ],
  },
  other: {
    "fc:frame": JSON.stringify({
      version: "next",
      imageUrl: `${process.env.NEXT_PUBLIC_URL}/assets/splash-image.jpg`,
      button: {
        title: "Scratch Off",
        action: {
          type: "launch_frame",
          name: "Scratch Off",
          url: process.env.NEXT_PUBLIC_URL,
          splashImageUrl: `${process.env.NEXT_PUBLIC_URL}/assets/splash-image.jpg`,
        },
      },
    }),
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <AppBootstrap>
            <Wrapper>{children}</Wrapper>
          </AppBootstrap>
        </Providers>
      </body>
    </html>
  );
}

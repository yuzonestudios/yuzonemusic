import type { Metadata } from "next";
import NextTopLoader from 'nextjs-toploader';
import Providers from "./providers";
import "./globals.css";

export const metadata: Metadata = {
    title: "Yuzone Music - Stream Your Favorite Music",
    description: "Discover and stream millions of songs with Yuzone Music. Modern music streaming experience with YouTube Music integration.",
    keywords: ["music", "streaming", "youtube music", "songs", "playlist"],
    authors: [{ name: "Yuzone Studios" }],
    openGraph: {
        title: "Yuzone Music",
        description: "Stream your favorite music",
        type: "website",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body>
                <NextTopLoader
                    color="var(--accent-primary)"
                    initialPosition={0.08}
                    crawlSpeed={200}
                    height={3}
                    crawl={true}
                    showSpinner={false}
                    easing="ease"
                    speed={200}
                    shadow="0 0 10px var(--accent-primary),0 0 5px var(--accent-primary)"
                />
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}

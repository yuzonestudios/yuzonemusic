import type { Metadata } from "next";
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
        <html lang="en">
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}

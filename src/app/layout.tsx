import type { Metadata } from "next";
import NextTopLoader from 'nextjs-toploader';
import Providers from "./providers";
import DeepLinkHandler from "@/components/DeepLinkHandler";
import "./globals.css";

export const metadata: Metadata = {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
    title: "Yuzone Music - Stream Your Favorite Music",
    description: "Discover and stream millions of songs with Yuzone Music. Modern music streaming experience with YouTube Music integration.",
    keywords: ["music", "streaming", "youtube music", "songs", "playlist"],
    authors: [{ name: "Yuzone Studios" }],
    manifest: "/manifest.json",
    icons: {
        icon: "/logo.png",
        shortcut: "/logo.png",
        apple: "/logo.png",
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "Yuzone Music",
    },
    openGraph: {
        title: "Yuzone Music",
        description: "Stream your favorite music",
        type: "website",
        images: ["/logo.png"],
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
                                <script
                                        dangerouslySetInnerHTML={{
                                                __html: `(function(){
    try {
        var send=function(payload){
            try {
                if (navigator.sendBeacon) {
                    var blob=new Blob([JSON.stringify(payload)],{type:'application/json'});
                    navigator.sendBeacon('/api/error-log',blob);
                } else {
                    fetch('/api/error-log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),keepalive:true}).catch(function(){});
                }
            } catch (e) {}
        };
        window.addEventListener('error',function(event){
            var err=event.error||{};
            send({
                type:'error',
                message:err.message||event.message||'Unknown error',
                name:err.name||'Error',
                stack:err.stack||null,
                source:event.filename||null,
                line:event.lineno||null,
                column:event.colno||null,
                url:window.location.href,
                userAgent:navigator.userAgent,
                timestamp:new Date().toISOString()
            });
        });
        window.addEventListener('unhandledrejection',function(event){
            var reason=event.reason||{};
            send({
                type:'unhandledrejection',
                message:reason.message||String(reason)||'Unhandled rejection',
                name:reason.name||'UnhandledRejection',
                stack:reason.stack||null,
                url:window.location.href,
                userAgent:navigator.userAgent,
                timestamp:new Date().toISOString()
            });
        });
    } catch (e) {}
})();`,
                                        }}
                                />
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
                <DeepLinkHandler />
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}

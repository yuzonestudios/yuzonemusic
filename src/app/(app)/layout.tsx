import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Sidebar from "@/components/layout/Sidebar";
import MusicPlayer from "@/components/player/MusicPlayer";
import AmbientBackground from "@/components/ui/AmbientBackground";
import styles from "./layout.module.css";

export default async function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        // Redirect to signout to clear invalid session/cookies and prevent redirect loop
        redirect("/api/auth/signout?callbackUrl=/login");
    }

    return (
        <div className={styles.appLayout}>
            <AmbientBackground />
            <Sidebar />
            <main className={styles.main}>{children}</main>
            <MusicPlayer />
        </div>
    );
}

import Sidebar from "@/components/layout/Sidebar";
import MusicPlayer from "@/components/player/MusicPlayer";
import styles from "./layout.module.css";

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className={styles.appLayout}>
            <Sidebar />
            <main className={styles.main}>{children}</main>
            <MusicPlayer />
        </div>
    );
}

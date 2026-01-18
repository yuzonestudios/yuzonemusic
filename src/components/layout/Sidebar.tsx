"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Home, Search, Library, Trophy, Settings, ListMusic, Sparkles } from "lucide-react";
import styles from "./Sidebar.module.css";

interface NavItem {
    href: string;
    label: string;
    icon: React.ReactNode;
}
const navItems: NavItem[] = [
    {
        href: "/dashboard",
        label: "Home",
        icon: <Home size={24} />,
    },
    {
        href: "/search",
        label: "Search",
        icon: <Search size={24} />,
    },
    {
        href: "/recommendations",
        label: "For You",
        icon: <Sparkles size={24} />,
    },
    {
        href: "/top",
        label: "Top Songs",
        icon: <Trophy size={24} />,
    },
    {
        href: "/library",
        label: "Library",
        icon: <Library size={24} />,
    },
    {
        href: "/playlists",
        label: "Playlists",
        icon: <ListMusic size={24} />,
    },
    {
        href: "/settings",
        label: "Settings",
        icon: <Settings size={24} />,
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();

    return (
        <aside className={styles.sidebar}>
            <div className={styles.logo}>
                <div className={styles.logoIcon}>
                    <img src="/logo.png" alt="Yuzone Music" className={styles.logoImage} />
                </div>
                <div className={styles.logoInfo}>
                    <span className={styles.logoText}>Yuzone Music</span>
                </div>
            </div>

            <nav className={styles.nav}>
                <ul className={styles.navList}>
                    {navItems.map((item) => (
                        <li key={item.href}>
                            <Link
                                href={item.href}
                                className={`${styles.navItem} ${pathname === item.href ? styles.active : ""
                                    }`}
                            >
                                <span className={styles.navIcon}>{item.icon}</span>
                                <span className={styles.navLabel}>{item.label}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>

            <div className={styles.footer}>
                {session?.user && (
                    <div className={styles.userProfile}>
                        <img
                            src={session.user.image || "/placeholder-user.png"}
                            alt={session.user.name || "User"}
                            className={styles.avatar}
                        />
                        <div className={styles.userInfo}>
                            <span className={styles.userName}>{(session.user as any).displayName || session.user.name || "User"}</span>
                            <span className={styles.premiumBadge}>Premium User</span>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}

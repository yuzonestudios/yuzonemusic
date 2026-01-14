"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Home, Search, Library, Trophy, Settings } from "lucide-react";
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
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                        <defs>
                            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#8b5cf6" />
                                <stop offset="100%" stopColor="#06b6d4" />
                            </linearGradient>
                        </defs>
                        <circle cx="16" cy="16" r="14" fill="url(#logoGradient)" />
                        <path d="M12 10v12l10-6z" fill="white" />
                    </svg>
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
                            <span className={styles.userName}>{session.user.name || "User"}</span>
                            <span className={styles.premiumBadge}>Premium User</span>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}

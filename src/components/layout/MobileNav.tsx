"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Library, Trophy, ListMusic, Settings, Sparkles } from "lucide-react";
import styles from "./MobileNav.module.css";

const navItems = [
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
        href: "/library",
        label: "Library",
        icon: <Library size={24} />,
    },
    {
        href: "/playlists",
        label: "Playlists",
        icon: <ListMusic size={20} />,
    },
    {
        href: "/settings",
        label: "Settings",
        icon: <Settings size={22} />,
    },
];

export default function MobileNav() {
    const pathname = usePathname();

    return (
        <nav className={styles.mobileNav}>
            {navItems.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.navItem} ${pathname === item.href ? styles.active : ""}`}
                >
                    <span className={styles.icon}>{item.icon}</span>
                    <span className={styles.label}>{item.label}</span>
                </Link>
            ))}
        </nav>
    );
}

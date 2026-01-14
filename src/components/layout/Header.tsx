"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, Home, Search, Library, Trophy, Settings } from "lucide-react";
import styles from "./Header.module.css";

interface HeaderProps {
    title?: string;
}

const navItems = [
    { href: "/dashboard", label: "Home", icon: Home },
    { href: "/search", label: "Search", icon: Search },
    { href: "/top", label: "Top Songs", icon: Trophy },
    { href: "/library", label: "Library", icon: Library },
    { href: "/settings", label: "Settings", icon: Settings },
];

export default function Header({ title }: HeaderProps) {
    const { data: session } = useSession();
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <>
            <header className={styles.header}>
                <div className={styles.left}>
                    <button 
                        className={styles.menuBtn}
                        onClick={() => setMenuOpen(true)}
                        aria-label="Open menu"
                    >
                        <Menu size={24} />
                    </button>
                    {title && <h1 className={styles.title}>{title}</h1>}
                </div>

                <div className={styles.right}>
                    {session?.user && (
                        <div className={styles.userMenu}>
                            <div className={styles.userInfo}>
                                <span className={styles.userName}>{session.user.name}</span>
                            </div>
                            {session.user.image && (
                                <Image
                                    src={session.user.image}
                                    alt={session.user.name || "User"}
                                    width={40}
                                    height={40}
                                    className={styles.avatar}
                                />
                            )}
                            <button
                                onClick={() => signOut({ callbackUrl: "/login" })}
                                className={styles.signOutBtn}
                                title="Sign out"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                    <polyline points="16 17 21 12 16 7" />
                                    <line x1="21" y1="12" x2="9" y2="12" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Mobile Navigation Drawer */}
            {menuOpen && (
                <>
                    <div className={styles.overlay} onClick={() => setMenuOpen(false)} />
                    <nav className={styles.drawer}>
                        <div className={styles.drawerHeader}>
                            <div className={styles.logo}>
                                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                                    <circle cx="16" cy="16" r="14" stroke="url(#grad1)" strokeWidth="2" />
                                    <path d="M12 10l8 6-8 6V10z" fill="url(#grad1)" />
                                    <defs>
                                        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="var(--accent-primary)" />
                                            <stop offset="100%" stopColor="var(--accent-secondary)" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <span className={styles.logoText}>Yuzone</span>
                            </div>
                            <button 
                                className={styles.closeBtn}
                                onClick={() => setMenuOpen(false)}
                                aria-label="Close menu"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className={styles.navLinks}>
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`${styles.navLink} ${pathname === item.href ? styles.active : ""}`}
                                        onClick={() => setMenuOpen(false)}
                                    >
                                        <Icon size={22} />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </nav>
                </>
            )}
        </>
    );
}

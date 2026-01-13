"use client";

import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import styles from "./Header.module.css";

interface HeaderProps {
    title?: string;
}

export default function Header({ title }: HeaderProps) {
    const { data: session } = useSession();

    return (
        <header className={styles.header}>
            <div className={styles.left}>
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
    );
}

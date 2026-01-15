"use client";

import Image from "next/image";
import { Music } from "lucide-react";
import styles from "./SidebarBanner.module.css";

interface SidebarBannerProps {
    title: string;
    subtitle?: string;
    image?: string;
}

export default function SidebarBanner({ title, subtitle, image }: SidebarBannerProps) {
    return (
        <div className={styles.banner}>
            <div className={styles.imageContainer}>
                {image ? (
                    <Image
                        src={image}
                        alt={title}
                        width={120}
                        height={120}
                        className={styles.image}
                    />
                ) : (
                    <div className={styles.placeholder}>
                        <Music size={48} />
                    </div>
                )}
            </div>
            <div className={styles.info}>
                <h3 className={styles.title}>{title}</h3>
                {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            </div>
        </div>
    );
}

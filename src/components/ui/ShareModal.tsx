"use client";

import { useState, useEffect } from "react";
import styles from "./ShareModal.module.css";

interface ShareModalProps {
    contentType: "playlist" | "song";
    contentId: string;
    contentName: string;
    onClose: () => void;
}

export default function ShareModal({
    contentType,
    contentId,
    contentName,
    onClose,
}: ShareModalProps) {
    const [shareUrl, setShareUrl] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>("");
    const [copied, setCopied] = useState(false);
    const [expiresIn, setExpiresIn] = useState<string>("");

    const generateShareLink = async () => {
        setIsLoading(true);
        setError("");
        try {
            const response = await fetch("/api/share/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    contentType,
                    contentId,
                    expiresIn: expiresIn ? parseInt(expiresIn) : undefined,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to generate share link");
            }

            const data = await response.json();
            setShareUrl(data.share.shareUrl);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            setError("Failed to copy to clipboard");
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeBtn} onClick={onClose}>
                    ✕
                </button>

                <h2 className={styles.title}>Share {contentType}</h2>
                <p className={styles.contentName}>{contentName}</p>

                {!shareUrl ? (
                    <>
                        <div className={styles.section}>
                            <label className={styles.label}>Link Expiration (optional)</label>
                            <select
                                value={expiresIn}
                                onChange={(e) => setExpiresIn(e.target.value)}
                                className={styles.select}
                            >
                                <option value="">Never expires</option>
                                <option value="3600">1 hour</option>
                                <option value="86400">1 day</option>
                                <option value="604800">1 week</option>
                                <option value="2592000">30 days</option>
                            </select>
                        </div>

                        {error && <p className={styles.error}>{error}</p>}

                        <button
                            onClick={generateShareLink}
                            disabled={isLoading}
                            className={styles.button}
                        >
                            {isLoading ? "Generating..." : "Generate Share Link"}
                        </button>
                    </>
                ) : (
                    <>
                        <div className={styles.section}>
                            <label className={styles.label}>Share Link</label>
                            <div className={styles.linkContainer}>
                                <input
                                    type="text"
                                    value={shareUrl}
                                    readOnly
                                    className={styles.linkInput}
                                />
                                <button
                                    onClick={copyToClipboard}
                                    className={`${styles.button} ${styles.copyBtn}`}
                                >
                                    {copied ? "Copied!" : "Copy"}
                                </button>
                            </div>
                            <p className={styles.info}>
                                Anyone with this link can view this {contentType} without logging in.
                            </p>
                        </div>

                        <button onClick={generateShareLink} className={styles.buttonSecondary}>
                            Generate New Link
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

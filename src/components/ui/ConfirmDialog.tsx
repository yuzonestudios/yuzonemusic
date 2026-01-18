"use client";

import { useState } from "react";
import { AlertTriangle, Info } from "lucide-react";
import styles from "./ConfirmDialog.module.css";

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant?: "warning" | "info";
}

export default function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    onConfirm,
    onCancel,
    variant = "warning",
}: ConfirmDialogProps) {
    const [isConfirming, setIsConfirming] = useState(false);

    if (!isOpen) return null;

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && !isConfirming) {
            onCancel();
        }
    };

    const handleConfirm = () => {
        if (isConfirming) return;
        setIsConfirming(true);
        onConfirm();
    };

    return (
        <div className={styles.overlay} onClick={handleOverlayClick}>
            <div className={styles.dialog}>
                <div className={styles.header}>
                    <div className={`${styles.iconWrapper} ${styles[variant]}`}>
                        {variant === "warning" ? (
                            <AlertTriangle size={24} />
                        ) : (
                            <Info size={24} />
                        )}
                    </div>
                    <div className={styles.textContent}>
                        <h3 className={styles.title}>{title}</h3>
                        <p className={styles.message}>{message}</p>
                    </div>
                </div>

                <div className={styles.actions}>
                    <button
                        className={`${styles.btn} ${styles.cancelBtn}`}
                        onClick={onCancel}
                        disabled={isConfirming}
                    >
                        {cancelText}
                    </button>
                    <button
                        className={`${styles.btn} ${styles.confirmBtn} ${variant === "info" ? styles.primary : ""}`}
                        onClick={handleConfirm}
                        disabled={isConfirming}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

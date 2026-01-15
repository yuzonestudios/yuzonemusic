"use client";

import { useState } from "react";
import { X } from "lucide-react";
import styles from "./PlaylistModal.module.css";

interface CreatePlaylistModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string, description: string) => Promise<void>;
}

export default function CreatePlaylistModal({
    isOpen,
    onClose,
    onCreate,
}: CreatePlaylistModalProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || isCreating) return;

        setIsCreating(true);
        try {
            await onCreate(name, description);
            setName("");
            setDescription("");
            onClose();
        } catch (error) {
            console.error("Error creating playlist:", error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={handleOverlayClick}>
            <div className={styles.modal}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>Create Playlist</h2>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label htmlFor="name" className={styles.label}>
                            Name *
                        </label>
                        <input
                            id="name"
                            type="text"
                            className={styles.input}
                            placeholder="My Playlist"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={50}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="description" className={styles.label}>
                            Description
                        </label>
                        <textarea
                            id="description"
                            className={styles.textarea}
                            placeholder="Add a description (optional)"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            maxLength={200}
                        />
                    </div>

                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={`${styles.btn} ${styles.cancelBtn}`}
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={`${styles.btn} ${styles.createBtn}`}
                            disabled={!name.trim() || isCreating}
                        >
                            {isCreating ? "Creating..." : "Create"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

"use client";

import { useEffect, useState } from "react";
import { X, UploadCloud, Link as LinkIcon, Trash2 } from "lucide-react";
import styles from "./PlaylistModal.module.css";

interface UpdatePlaylistImageModalProps {
    isOpen: boolean;
    initialThumbnail?: string | null;
    onClose: () => void;
    onSave: (thumbnail: string | null) => Promise<void>;
}

const MAX_IMAGE_BYTES = 1_500_000;

export default function UpdatePlaylistImageModal({
    isOpen,
    initialThumbnail,
    onClose,
    onSave,
}: UpdatePlaylistImageModalProps) {
    const [imageUrl, setImageUrl] = useState("");
    const [preview, setPreview] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");
    const [isRemoving, setIsRemoving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const initial = initialThumbnail || "";
        setImageUrl(initial);
        setPreview(initial || null);
        setError("");
        setIsRemoving(false);
    }, [isOpen, initialThumbnail]);

    if (!isOpen) return null;

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setError("Please select an image file.");
            return;
        }

        if (file.size > MAX_IMAGE_BYTES) {
            setError("Image is too large. Please choose a file under 1.5MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const result = typeof reader.result === "string" ? reader.result : "";
            if (!result) {
                setError("Unable to read the selected image.");
                return;
            }
            setImageUrl(result);
            setPreview(result);
            setIsRemoving(false);
            setError("");
        };
        reader.onerror = () => setError("Unable to read the selected image.");
        reader.readAsDataURL(file);
    };

    const handleUrlChange = (value: string) => {
        setImageUrl(value);
        setPreview(value.trim() ? value.trim() : null);
        setIsRemoving(false);
    };

    const handleRemoveImage = () => {
        setImageUrl("");
        setPreview(null);
        setIsRemoving(true);
        setError("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving) return;

        setIsSaving(true);
        setError("");
        try {
            const thumbnail = isRemoving ? null : preview || null;
            await onSave(thumbnail);
            onClose();
        } catch (saveError: any) {
            setError(saveError?.message || "Failed to update playlist image.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={handleOverlayClick}>
            <div className={styles.modal}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>Update Playlist Image</h2>
                    <button className={styles.closeBtn} onClick={onClose} type="button">
                        <X size={20} />
                    </button>
                </div>

                {error && (
                    <div className={`${styles.message} ${styles.error}`}>
                        {error}
                    </div>
                )}

                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Preview</label>
                        <div className={styles.imagePreview}>
                            {preview ? (
                                <img src={preview} alt="Playlist preview" />
                            ) : (
                                <span className={styles.imagePlaceholder}>No image selected</span>
                            )}
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Upload image</label>
                        <label className={styles.fileInput}>
                            <UploadCloud size={18} />
                            Choose file
                            <input type="file" accept="image/*" onChange={handleFileChange} />
                        </label>
                        <span className={styles.helperText}>PNG or JPG, up to 1.5MB.</span>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Image URL</label>
                        <div className={styles.inputWithIcon}>
                            <LinkIcon size={16} />
                            <input
                                type="url"
                                className={styles.input}
                                placeholder="https://example.com/cover.jpg"
                                value={imageUrl}
                                onChange={(e) => handleUrlChange(e.target.value)}
                            />
                        </div>
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
                            type="button"
                            className={`${styles.btn} ${styles.removeBtn}`}
                            onClick={handleRemoveImage}
                            disabled={!preview || isSaving}
                        >
                            <Trash2 size={16} />
                            Remove
                        </button>
                        <button
                            type="submit"
                            className={`${styles.btn} ${styles.createBtn}`}
                            disabled={isSaving}
                        >
                            {isSaving ? "Saving..." : "Save"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

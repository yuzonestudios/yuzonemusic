import styles from "./ErrorState.module.css";

interface ErrorStateProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
}

export default function ErrorState({
    title = "Something went wrong",
    message = "An error occurred while loading this content.",
    onRetry,
}: ErrorStateProps) {
    return (
        <div className={styles.container}>
            <div className={styles.icon}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
            </div>
            <h3 className={styles.title}>{title}</h3>
            <p className={styles.message}>{message}</p>
            {onRetry && (
                <button onClick={onRetry} className={styles.retryBtn}>
                    Try Again
                </button>
            )}
        </div>
    );
}

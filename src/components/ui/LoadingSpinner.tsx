import styles from "./LoadingSpinner.module.css";

interface LoadingSpinnerProps {
    size?: "small" | "medium" | "large";
    text?: string;
}

export default function LoadingSpinner({ size = "medium", text }: LoadingSpinnerProps) {
    return (
        <div className={styles.container}>
            <div className={`${styles.spinner} ${styles[size]}`}>
                <svg viewBox="0 0 50 50" className={styles.svg}>
                    <circle
                        className={styles.circle}
                        cx="25"
                        cy="25"
                        r="20"
                        fill="none"
                        strokeWidth="4"
                    />
                </svg>
            </div>
            {text && <span className={styles.text}>{text}</span>}
        </div>
    );
}

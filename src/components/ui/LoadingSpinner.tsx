import styles from "./LoadingSpinner.module.css";

interface LoadingSpinnerProps {
    size?: "small" | "medium" | "large";
    text?: string;
}

export default function LoadingSpinner({ size = "medium", text }: LoadingSpinnerProps) {
    return (
        <div className={styles.container}>
            <div className={`${styles.spinner} ${styles[size]}`}>
                {/* Music-themed loading animation with bars */}
                <div className={styles.musicBars}>
                    <div className={styles.bar}></div>
                    <div className={styles.bar}></div>
                    <div className={styles.bar}></div>
                    <div className={styles.bar}></div>
                    <div className={styles.bar}></div>
                </div>
            </div>
            {text && <span className={styles.text}>{text}</span>}
        </div>
    );
}

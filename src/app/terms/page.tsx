import type { Metadata } from "next";
import styles from "./terms.module.css";

export const metadata: Metadata = {
    title: "Terms of Service | Yuzone Music",
    description:
        "Read the terms that govern your use of Yuzone Music, including account responsibilities, acceptable use, and content policies.",
};

export default function TermsPage() {
    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <header className={styles.hero}>
                    <span className={styles.badge}>Legal</span>
                    <h1 className={styles.title}>Terms of Service</h1>
                    <p className={styles.subtitle}>
                        Welcome to Yuzone Music. These terms describe the rules, responsibilities, and protections that
                        apply to every listener, creator, and community member.
                    </p>
                    <div className={styles.meta}>Last updated: February 3, 2026</div>
                    <div className={styles.heroActions}>
                        <a href="#overview" className={styles.primaryButton}>
                            Start reading
                        </a>
                        <a href="mailto:help@yuzone.me" className={styles.secondaryButton}>
                            Contact support
                        </a>
                    </div>
                </header>

                <section className={`${styles.card} ${styles.toc}`} aria-label="Table of contents">
                    <h2>Quick navigation</h2>
                    <ul>
                        <li><a href="#overview">1. Overview</a></li>
                        <li><a href="#eligibility">2. Eligibility & account security</a></li>
                        <li><a href="#subscriptions">3. Plans, billing, and trials</a></li>
                        <li><a href="#content">4. Content and licensing</a></li>
                        <li><a href="#usage">5. Acceptable use</a></li>
                        <li><a href="#downloads">6. Downloads & offline access</a></li>
                        <li><a href="#feedback">7. Feedback and suggestions</a></li>
                        <li><a href="#termination">8. Suspension & termination</a></li>
                        <li><a href="#disclaimer">9. Disclaimers & limitations</a></li>
                        <li><a href="#contact">10. Contact us</a></li>
                    </ul>
                </section>

                <section id="overview" className={styles.card}>
                    <h2>1. Overview</h2>
                    <p>
                        By accessing or using Yuzone Music, you agree to these Terms of Service and our privacy practices.
                        If you do not agree, please stop using the service. Yuzone Music provides streaming, discovery,
                        and playlist features to help you enjoy music in a safe and respectful environment.
                    </p>
                </section>

                <section id="eligibility" className={styles.card}>
                    <h2>2. Eligibility & account security</h2>
                    <p>
                        You must be at least 13 years old (or the minimum age required in your region) to use Yuzone Music.
                        You are responsible for maintaining the confidentiality of your account credentials and for all
                        activity that occurs under your account.
                    </p>
                    <ul>
                        <li>Keep your login secure and avoid sharing your password.</li>
                        <li>Notify us immediately if you suspect unauthorized access.</li>
                        <li>Ensure your profile information is accurate and current.</li>
                    </ul>
                </section>

                <section id="subscriptions" className={styles.card}>
                    <h2>3. Plans, billing, and trials</h2>
                    <p>
                        We may offer free and paid plans, including promotional trials. Paid plans are billed on a
                        recurring basis unless canceled. Taxes may apply depending on your location.
                    </p>
                    <ul>
                        <li>Trials automatically convert to paid plans unless canceled before the trial ends.</li>
                        <li>Refunds are granted only when required by law or explicitly stated in a plan offer.</li>
                        <li>Pricing and plan features may change with advance notice.</li>
                    </ul>
                </section>

                <section id="content" className={styles.card}>
                    <h2>4. Content and licensing</h2>
                    <p>
                        Yuzone Music streams content under license from rights holders. The music, artwork, metadata, and
                        other materials are protected by intellectual property laws. Your access is limited to personal,
                        non-commercial use unless a separate agreement is provided.
                    </p>
                </section>

                <section id="usage" className={styles.card}>
                    <h2>5. Acceptable use</h2>
                    <p>
                        We are committed to a respectful, safe experience. Do not misuse the service or attempt to bypass
                        security or content protections.
                    </p>
                    <ul>
                        <li>Do not upload, share, or distribute unauthorized content.</li>
                        <li>Do not reverse engineer, scrape, or exploit the service.</li>
                        <li>Do not use Yuzone Music to harass, spam, or harm others.</li>
                        <li>Do not interfere with playback, recommendations, or analytics systems.</li>
                    </ul>
                </section>

                <section id="downloads" className={styles.card}>
                    <h2>6. Downloads & offline access</h2>
                    <p>
                        Offline downloads are provided for personal listening. Downloaded content remains licensed, not
                        owned, and must not be redistributed or used for commercial purposes. If your subscription ends,
                        offline content may become unavailable.
                    </p>
                </section>

                <section id="feedback" className={styles.card}>
                    <h2>7. Feedback and suggestions</h2>
                    <p>
                        We love hearing your ideas. If you submit feedback or feature suggestions, you grant us a
                        non-exclusive, worldwide, royalty-free license to use and improve the service based on that
                        feedback without obligation to you.
                    </p>
                </section>

                <section id="termination" className={styles.card}>
                    <h2>8. Suspension & termination</h2>
                    <p>
                        We may suspend or terminate access if we reasonably believe there is a violation of these terms,
                        legal requirements, or risk to the community. You may cancel your account at any time.
                    </p>
                </section>

                <section id="disclaimer" className={styles.card}>
                    <h2>9. Disclaimers & limitations</h2>
                    <p>
                        Yuzone Music is provided “as is” and “as available.” We do not guarantee uninterrupted service or
                        that all content will be available at all times. To the maximum extent permitted by law, we are not
                        liable for indirect, incidental, or consequential damages.
                    </p>
                </section>

                <section id="contact" className={styles.card}>
                    <h2>10. Contact us</h2>
                    <p>
                        Questions about these terms? Email us at
                        <a href="mailto:help@yuzone.me"> help@yuzone.me</a>.
                    </p>
                </section>
            </div>
        </div>
    );
}

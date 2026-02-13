export const dynamic = "force-dynamic";

export default function VerifyPage() {
    return (
        <main style={{ padding: "4rem 1.5rem", maxWidth: 720, margin: "0 auto" }}>
            <h1 style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>Verify your account</h1>
            <p style={{ fontSize: "1rem", lineHeight: 1.6, opacity: 0.85 }}>
                If you reached this page from an email, return to the signup screen to enter your
                verification code.
            </p>
        </main>
    );
}

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AppLayoutClient from "./AppLayoutClient";

export default async function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        // Redirect to signout to clear invalid session/cookies and prevent redirect loop
        redirect("/api/auth/signout?callbackUrl=/login");
    }

    return <AppLayoutClient>{children}</AppLayoutClient>;
}

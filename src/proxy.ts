import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Public paths that don't require authentication
const publicPaths = ["/login", "/api/auth", "/api/stream", "/api/share", "/share"];

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check if the path is public
    const isPublicPath = publicPaths.some((path) => pathname.startsWith(path)) || pathname === "/";

    // Get the session token
    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
    });

    // If user is authenticated and trying to access login page or landing page, redirect to dashboard
    if (token && (pathname === "/login" || pathname === "/")) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // If user is not authenticated and trying to access protected route
    if (!token && !isPublicPath) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/auth).*)",
    ],
};

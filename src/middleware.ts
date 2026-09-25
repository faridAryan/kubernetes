import { withAuth } from "next-auth/middleware";

// Redirects signed-out visitors to /login before protected pages render
export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: ["/dashboard", "/review", "/learn/:path*", "/certifications/:slug/exam"],
};

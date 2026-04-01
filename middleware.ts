import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isPublicPage = createRouteMatcher(["/", "/login"]);
const isProtectedRoute = createRouteMatcher([
  "/holdings/:path*",
  "/holdings-overview/:path*",
  "/holdings-performance/:path*",
  "/net-worth/:path*",
  "/fire-metrics/:path*",
  "/budget/:path*",
  "/goal-tracker/:path*",
  "/cashflow-calculator/:path*",
  "/monte-carlo-simulator/:path*",
  "/dividend-calculator/:path*",
  "/finance-notes/:path*",
  "/lifetime-accumulation/:path*",
  "/what-if-scenarios/:path*",
  "/bed-and-isa/:path*",
  "/tax-loss-harvesting/:path*",
  "/one-off-cgt/:path*",
  "/accumulation-forecast/:path*",
  "/transactions/:path*",
  "/settings/:path*",
]);

export default convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    console.log("[DEBUG] Middleware running for:", request.url);
    const isAuthenticated = await convexAuth.isAuthenticated();
    console.log("[DEBUG] isAuthenticated:", isAuthenticated);
    
    if (isPublicPage(request) && isAuthenticated) {
      return nextjsMiddlewareRedirect(request, "/holdings");
    }
    
    if (isProtectedRoute(request) && !isAuthenticated) {
      return nextjsMiddlewareRedirect(request, "/");
    }
  },
  { cookieConfig: { maxAge: 60 * 60 * 24 * 30 }, verbose: true }
);

export const config = {
  matcher: ["/:path*"],
};
import {
  convexAuthNextjsMiddleware,
} from "@convex-dev/auth/nextjs/server";

export default convexAuthNextjsMiddleware(
  async () => {
  },
  { cookieConfig: { maxAge: 60 * 60 * 24 * 30 }, verbose: true }
);

export const config = {
  matcher: ["/:path*"],
};
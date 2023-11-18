import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  // Both "/" and "/about" will be accessible to all users
  publicRoutes: ["/", "/about", "/features", "/pricing", "/contact"],
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)']
};
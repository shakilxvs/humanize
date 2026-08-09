import { withAuth } from 'next-auth/middleware';

// Protects everything under /dashboard, /assignments, and /admin. Sign-up,
// login, and the marketing pages stay public.
export default withAuth({
  pages: { signIn: '/login' }
});

export const config = {
  matcher: ['/dashboard/:path*', '/assignments/:path*', '/admin/:path*']
};

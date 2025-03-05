import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicPaths = [
  '/signin',
  '/signup',
  '/api/auth/signin',
  '/api/auth/signup'
]

export function middleware(request: NextRequest) {
  return NextResponse.next() // Uncomment for simple pass through for development

  const accessToken = request.cookies.get('access_token')
  const path = request.nextUrl.pathname

  // Allow public paths
  if (publicPaths.some(publicPath => path.startsWith(publicPath))) {
    // If user is authenticated and trying to access auth pages, redirect to home
    if (accessToken) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  // Protect all other routes
  if (!accessToken) {
    const signinUrl = new URL('/signin', request.url)
    signinUrl.searchParams.set('from', path)
    return NextResponse.redirect(signinUrl)
  }

  return NextResponse.next()
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
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}

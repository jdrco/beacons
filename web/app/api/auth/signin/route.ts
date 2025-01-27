import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/signin`, {
      method: 'POST',
      body: formData,
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || 'Authentication failed' },
        { status: response.status }
      )
    }

    // Create response with the token
    const resp = NextResponse.json(
      { message: 'Authentication successful' },
      { status: 200 }
    )

    // Set the cookie from the backend response
    resp.cookies.set('access_token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // TODO: ensure this env present
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 24 hours
    })

    return resp
  } catch (error) {
    console.error('Signin error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

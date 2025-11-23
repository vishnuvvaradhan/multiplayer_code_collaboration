import { NextRequest, NextResponse } from 'next/server';

const GITHUB_CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/?error=no_code', request.url)
    );
  }

  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    console.error('GitHub OAuth configuration missing:', {
      hasClientId: !!GITHUB_CLIENT_ID,
      hasClientSecret: !!GITHUB_CLIENT_SECRET,
    });
    return NextResponse.redirect(
      new URL('/?error=github_not_configured', request.url)
    );
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('GitHub OAuth token exchange error:', tokenData);
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent(tokenData.error_description || tokenData.error)}`, request.url)
      );
    }

    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.redirect(
        new URL('/?error=no_token', request.url)
      );
    }

    // Parse state to get redirect path
    let redirectPath = '/';
    try {
      if (state) {
        const stateData = JSON.parse(atob(state));
        if (stateData.redirect) {
          redirectPath = stateData.redirect;
        }
      }
    } catch {
      // Ignore state parsing errors
    }

    // Redirect back to the app with the token
    // In production, you'd want to store this in a secure HTTP-only cookie
    // For now, we'll pass it as a query parameter that the client will store
    const redirectUrl = new URL(redirectPath, request.url);
    redirectUrl.searchParams.set('github_token', accessToken);

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    return NextResponse.redirect(
      new URL('/?error=oauth_failed', request.url)
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const owner = url.searchParams.get('owner');
  const repo = url.searchParams.get('repo');
  const number = url.searchParams.get('number');

  if (!owner || !repo || !number) {
    return NextResponse.json(
      { error: 'Missing owner, repo, or number' },
      { status: 400 }
    );
  }

  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${number}/comments`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Relay-App',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub PR comments error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to fetch PR comments', details: errorText },
        { status: response.status }
      );
    }

    const comments = await response.json();

    const normalized = (comments || []).map((c: any) => ({
      id: c.id,
      body: c.body,
      author: {
        login: c.user?.login,
        avatar_url: c.user?.avatar_url,
      },
      created_at: c.created_at,
      updated_at: c.updated_at,
      html_url: c.html_url,
    }));

    return NextResponse.json({ comments: normalized });
  } catch (error) {
    console.error('Error fetching PR comments:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}



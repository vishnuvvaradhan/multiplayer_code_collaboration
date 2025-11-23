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
      `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`,
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
      console.error('GitHub PR details error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to fetch PR details', details: errorText },
        { status: response.status }
      );
    }

    const pr = await response.json();

    const normalized = {
      number: pr.number,
      title: pr.title,
      state: pr.state,
      draft: pr.draft ?? false,
      merged: !!pr.merged_at,
      url: pr.html_url,
      author: {
        login: pr.user?.login,
        avatar_url: pr.user?.avatar_url,
      },
      base: {
        ref: pr.base?.ref,
      },
      head: {
        ref: pr.head?.ref,
        sha: pr.head?.sha,
      },
      created_at: pr.created_at,
      updated_at: pr.updated_at,
      merged_at: pr.merged_at,
    };

    return NextResponse.json({ pr: normalized });
  } catch (error) {
    console.error('Error fetching PR details:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}



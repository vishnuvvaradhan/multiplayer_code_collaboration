import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const owner = url.searchParams.get('owner');
  const repo = url.searchParams.get('repo');
  const sha = url.searchParams.get('sha');

  if (!owner || !repo || !sha) {
    return NextResponse.json(
      { error: 'Missing owner, repo, or sha' },
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
      `https://api.github.com/repos/${owner}/${repo}/commits/${sha}/check-runs`,
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
      console.error('GitHub PR checks error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to fetch PR checks', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const checks = (data.check_runs || []).map((run: any) => ({
      id: run.id,
      name: run.name,
      status: run.status,
      conclusion: run.conclusion,
      html_url: run.html_url,
      started_at: run.started_at,
      completed_at: run.completed_at,
    }));

    return NextResponse.json({ checks });
  } catch (error) {
    console.error('Error fetching PR checks:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}



import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const owner = url.searchParams.get('owner');
  const repo = url.searchParams.get('repo');
  const ticketId = url.searchParams.get('ticketId');

  if (!owner || !repo || !ticketId) {
    return NextResponse.json(
      { error: 'Missing owner, repo, or ticketId' },
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
    // Prefer branch-based lookup: branch name is always ticket_{ticketId}
    const branchName = `ticket_${ticketId}`;
    const headParam = `${owner}:${branchName}`;

    const branchResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls?head=${encodeURIComponent(headParam)}&state=all`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Relay-App',
        },
      }
    );

    if (!branchResponse.ok) {
      const errorText = await branchResponse.text();
      console.error('GitHub PR branch lookup error:', branchResponse.status, errorText);
      return NextResponse.json(
        { error: 'Failed to look up PR by branch', details: errorText },
        { status: branchResponse.status }
      );
    }

    const branchData = await branchResponse.json();
    const items = Array.isArray(branchData) ? branchData : [];
    const first = items[0];

    if (!first) {
      // Fallback: no PR on that branch – keep a clear 404
      return NextResponse.json({ error: 'No PR found for this ticket' }, { status: 404 });
    }

    const number = first.number;

    // Then, fetch full PR details using the number we found
    const prResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Relay-App',
        },
      }
    );

    if (!prResponse.ok) {
      const errorText = await prResponse.text();
      console.error('GitHub PR details (for-ticket) error:', prResponse.status, errorText);
      return NextResponse.json(
        { error: 'Failed to fetch PR details', details: errorText },
        { status: prResponse.status }
      );
    }

    const pr = await prResponse.json();

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
    console.error('Error fetching PR for ticket:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}




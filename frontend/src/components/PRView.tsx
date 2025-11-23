import { useEffect, useMemo, useState } from 'react';
import { GitPullRequest, CheckCircle, GitCommit, MessageSquare, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { getUserColor, getUserInitials } from '@/lib/database';
import { Button } from './ui/button';
import { getGitHubToken } from '@/lib/github';

interface PRViewProps {
  ticketId: string;
  ticketDbId: string | null;
  planExists: boolean;
  prExists: boolean;
  generating: boolean;
  prLink?: string;
  repoUrl?: string | null;
  onGeneratePR: () => Promise<void>;
}

export function PRView({ ticketId, ticketDbId, planExists, prExists, generating, prLink, repoUrl, onGeneratePR }: PRViewProps) {
  const showPRActions = false;

  interface ParsedPrLink {
    owner: string;
    repo: string;
    number: string;
  }

  interface PrDetails {
    number: number;
    title: string;
    state: string;
    draft: boolean;
    merged: boolean;
    url: string;
    author?: {
      login?: string;
      avatar_url?: string;
    };
    base?: { ref?: string };
    head?: { ref?: string; sha?: string };
    created_at?: string;
    updated_at?: string;
    merged_at?: string | null;
  }

  interface PrCheck {
    id: number;
    name: string;
    status: string;
    conclusion: string | null;
    html_url?: string;
    started_at?: string | null;
    completed_at?: string | null;
  }

  interface PrComment {
    id: number;
    body: string;
    author?: {
      login?: string;
      avatar_url?: string;
    };
    created_at?: string;
    updated_at?: string;
    html_url?: string;
  }

  const parsed = useMemo<ParsedPrLink | null>(() => {
    if (!prLink) return null;
    try {
      const withoutPrefix = prLink.replace('https://github.com/', '');
      const parts = withoutPrefix.split('/');
      const pullIndex = parts.indexOf('pull');
      if (pullIndex === -1 || pullIndex + 1 >= parts.length) {
        return null;
      }
      const owner = parts[0];
      const repo = parts[1];
      const number = parts[pullIndex + 1];
      if (!owner || !repo || !number) return null;
      return { owner, repo, number };
    } catch {
      return null;
    }
  }, [prLink]);

  const repoInfo = useMemo<{ owner: string; repo: string } | null>(() => {
    if (!repoUrl) return null;
    try {
      const withoutPrefix = repoUrl.replace('https://github.com/', '').replace(/\/$/, '');
      const parts = withoutPrefix.split('/');
      if (parts.length < 2) return null;
      const owner = parts[0];
      const repo = parts[1];
      if (!owner || !repo) return null;
      return { owner, repo };
    } catch {
      return null;
    }
  }, [repoUrl]);

  const [details, setDetails] = useState<PrDetails | null>(null);
  const [checks, setChecks] = useState<PrCheck[]>([]);
  const [comments, setComments] = useState<PrComment[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingChecks, setLoadingChecks] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      const token = getGitHubToken();
      if (!token) {
        setError('Connect GitHub to see live PR status and comments.');
        setDetails(null);
        setChecks([]);
        setComments([]);
        return;
      }

      if (!parsed && !repoInfo) {
        setDetails(null);
        setChecks([]);
        setComments([]);
        setError(null);
        return;
      }

      setError(null);
      setLoadingDetails(true);
      setLoadingChecks(true);
      setLoadingComments(true);

      try {
        let loadedDetails: PrDetails | null = null;

        if (parsed) {
          const detailsRes = await fetch(
            `/api/github/pr/details?owner=${encodeURIComponent(parsed.owner)}&repo=${encodeURIComponent(parsed.repo)}&number=${encodeURIComponent(parsed.number)}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (!detailsRes.ok) {
            const body = await detailsRes.json().catch(() => ({}));
            throw new Error(body.error || 'Failed to load PR details');
          }

          const detailsBody = (await detailsRes.json()) as { pr: PrDetails };
          loadedDetails = detailsBody.pr;
        } else if (repoInfo) {
          const forTicketRes = await fetch(
            `/api/github/pr/for-ticket?owner=${encodeURIComponent(repoInfo.owner)}&repo=${encodeURIComponent(repoInfo.repo)}&ticketId=${encodeURIComponent(ticketId)}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (!forTicketRes.ok) {
            const body = await forTicketRes.json().catch(() => ({}));
            throw new Error(body.error || 'Failed to find PR for this ticket');
          }

          const detailsBody = (await forTicketRes.json()) as { pr: PrDetails };
          loadedDetails = detailsBody.pr;
        }

        if (!isMounted || !loadedDetails) {
          return;
        }

        setDetails(loadedDetails);

        const headSha = loadedDetails.head?.sha;
        if (headSha) {
          const checksRes = await fetch(
            `/api/github/pr/checks?owner=${encodeURIComponent(parsed ? parsed.owner : repoInfo!.owner)}&repo=${encodeURIComponent(parsed ? parsed.repo : repoInfo!.repo)}&sha=${encodeURIComponent(headSha)}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (checksRes.ok) {
            const checksBody = (await checksRes.json()) as { checks: PrCheck[] };
            if (isMounted) {
              setChecks(checksBody.checks || []);
            }
          } else if (isMounted) {
            setChecks([]);
          }
        } else if (isMounted) {
          setChecks([]);
        }

        const commentsRes = await fetch(
          `/api/github/pr/comments?owner=${encodeURIComponent(parsed ? parsed.owner : repoInfo!.owner)}&repo=${encodeURIComponent(parsed ? parsed.repo : repoInfo!.repo)}&number=${encodeURIComponent(loadedDetails.number)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (commentsRes.ok) {
          const commentsBody = (await commentsRes.json()) as { comments: PrComment[] };
          if (isMounted) {
            setComments(commentsBody.comments || []);
          }
        } else if (isMounted) {
          setComments([]);
        }
      } catch (e) {
        if (!isMounted) return;
        setError(e instanceof Error ? e.message : 'Failed to load PR information');
        setDetails(null);
        setChecks([]);
        setComments([]);
      } finally {
        if (isMounted) {
          setLoadingDetails(false);
          setLoadingChecks(false);
          setLoadingComments(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [parsed, prLink, repoInfo, ticketId]);

  return (
    <div className="p-6 space-y-6">
      {/* Action Button */}
      {showPRActions && (
        <>
          <Button
            onClick={onGeneratePR}
            disabled={generating || !ticketDbId || !planExists}
            className="w-full"
            variant={prExists ? "outline" : "default"}
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating PR...
              </>
            ) : (
              <>
                <GitPullRequest className="w-4 h-4 mr-2" />
                Generate PR
              </>
            )}
          </Button>
          
          {!planExists && !prExists && (
            <div className="text-center py-8 text-gray-500 text-sm">
              Please create a plan first before generating a PR.
            </div>
          )}
        </>
      )}
      {/* PR Header */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-purple-900/50 flex items-center justify-center flex-shrink-0">
            <GitPullRequest className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white mb-1 truncate">
              {details?.title
                ? details.title
                : prLink
                ? 'Linked Pull Request'
                : 'No PR linked yet'}
            </h3>
            {details && (
              <div className="flex items-center flex-wrap gap-2 text-xs text-gray-400">
                <span
                  className={`px-2 py-0.5 rounded border ${
                    details.merged
                      ? 'bg-purple-900/40 text-purple-200 border-purple-700/60'
                      : details.state === 'closed'
                      ? 'bg-red-900/30 text-red-200 border-red-700/60'
                      : 'bg-green-900/30 text-green-200 border-green-800/60'
                  }`}
                >
                  {details.merged
                    ? 'Merged'
                    : details.state === 'closed'
                    ? 'Closed'
                    : 'Open'}
                </span>
                <span className="text-gray-400">#{details.number}</span>
                {details.base?.ref && details.head?.ref && (
                  <span className="text-gray-400 truncate">
                    <span className="text-gray-500"> {details.head.ref}</span>
                    <span className="text-gray-500"> → </span>
                    <code className="px-1 py-0.5 bg-gray-900 rounded text-[11px] text-gray-200">
                      {details.base.ref}
                    </code>
                  </span>
                )}
              </div>
            )}
            {!details && prLink && (
              <div className="flex items-center gap-2 mt-1 text-xs text-blue-300">
                <span>Linked PR:</span>
                <a
                  href={prLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-blue-100"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span className="truncate max-w-[140px]">
                    {prLink.replace('https://github.com/', '')}
                  </span>
                </a>
              </div>
            )}
            {!prLink && (
              <p className="text-xs text-gray-400 mt-1">
                No pull request has been generated for this ticket yet.
              </p>
            )}
          </div>
        </div>

        {details && (
          <div className="flex items-center gap-4 text-sm text-gray-400 mb-1">
            <div className="flex items-center gap-1.5">
              {details.author?.login && (
                <>
                  {(() => {
                    const name = details.author?.login || 'author';
                    const color = getUserColor(name);
                    return (
                      <div
                        className={`w-6 h-6 rounded-full ${color.bg} ${color.text} flex items-center justify-center border border-gray-400`}
                      >
                        <span className="text-xs font-medium">
                          {getUserInitials(name)}
                        </span>
                      </div>
                    );
                  })()}
                  <span>{details.author.login}</span>
                </>
              )}
            </div>
            {details.created_at && (
              <span className="text-xs text-gray-500">
                opened {new Date(details.created_at).toLocaleString()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Error / info banner */}
      {error && (
        <div className="bg-yellow-900/40 border border-yellow-700 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-300 mt-0.5" />
          <div className="text-xs text-yellow-100">
            <div className="font-medium mb-0.5">PR status unavailable</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      {/* Checks */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm text-gray-300">Checks</h4>
          {loadingChecks && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading…
            </span>
          )}
        </div>
        {checks.length === 0 && !loadingChecks ? (
          <p className="text-xs text-gray-500">
            {parsed && !error
              ? 'No checks found for the latest commit.'
              : 'Checks will appear here once a PR exists and GitHub is connected.'}
          </p>
        ) : (
          <div className="space-y-2.5">
            {checks.map((check) => {
              const isSuccess = check.conclusion === 'success';
              const isPending =
                check.status === 'queued' ||
                check.status === 'in_progress' ||
                check.conclusion === null;
              const isFailure =
                !isSuccess && !isPending && !!check.conclusion;

              return (
                <div
                  key={check.id}
                  className="flex items-center gap-2.5 text-sm text-gray-300"
                >
                  <CheckCircle
                    className={`w-4 h-4 ${
                      isSuccess
                        ? 'text-green-500'
                        : isFailure
                        ? 'text-red-500'
                        : 'text-yellow-400'
                    }`}
                  />
                  <span className="truncate flex-1">{check.name}</span>
                  {check.completed_at && (
                    <span className="ml-auto text-xs text-gray-500">
                      {new Date(check.completed_at).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Activity / comments */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm text-gray-300">Activity</h4>
          {loadingComments && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading…
            </span>
          )}
        </div>
        {comments.length === 0 && !loadingComments ? (
          <p className="text-xs text-gray-500">
            {parsed && !error
              ? 'No comments on this PR yet.'
              : 'Comments will appear here once a PR exists and GitHub is connected.'}
          </p>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {comments.map((comment) => {
              const login = comment.author?.login || 'commenter';
              const color = getUserColor(login);
              return (
                <div key={comment.id} className="flex gap-3">
                  <div
                    className={`w-6 h-6 rounded-full ${color.bg} ${color.text} flex items-center justify-center flex-shrink-0 border border-gray-500`}
                  >
                    <span className="text-xs font-medium">
                      {getUserInitials(login)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                      <span className="text-gray-200">{login}</span>
                      {comment.created_at && (
                        <span>
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="bg-gray-900 rounded-lg p-2 text-xs text-gray-200 border border-gray-700 whitespace-pre-wrap">
                      {comment.body}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
import { GitPullRequest, CheckCircle, GitCommit, MessageSquare, Loader2, ExternalLink } from 'lucide-react';
import { getUserColor, getUserInitials } from '@/lib/database';
import { Button } from './ui/button';

interface PRViewProps {
  ticketId: string;
  ticketDbId: string | null;
  planExists: boolean;
  prExists: boolean;
  generating: boolean;
  onGeneratePR: () => Promise<void>;
}

export function PRView({ ticketId, ticketDbId, planExists, prExists, generating, onGeneratePR }: PRViewProps) {
  return (
    <div className="p-6 space-y-6">
      {/* Action Button */}
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
      {/* PR Header */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-purple-900/50 flex items-center justify-center flex-shrink-0">
            <GitPullRequest className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-white mb-1">
              Add payment validation to checkout
            </h3>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-green-900/30 text-green-400 rounded text-xs border border-green-800/50">
                Open
              </span>
              <span className="text-xs text-gray-500">#247</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
          <div className="flex items-center gap-1.5">
            {(() => {
              const agentName = 'dev-agent';
              const agentColor = getUserColor(agentName);
              return (
                <div className={`w-6 h-6 rounded-full ${agentColor.bg} ${agentColor.text} flex items-center justify-center border border-gray-400`}>
                  <span className="text-xs font-medium">{getUserInitials(agentName)}</span>
                </div>
              );
            })()}
            <span>dev-agent</span>
          </div>
          <span>wants to merge into</span>
          <code className="px-2 py-0.5 bg-gray-900 rounded text-xs text-gray-300">main</code>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <GitCommit className="w-4 h-4 text-gray-500" />
            <span className="text-gray-400">3 commits</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-gray-500" />
            <span className="text-gray-400">2 comments</span>
          </div>
        </div>
      </div>

      {/* Checks */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-sm">
        <h4 className="text-sm text-gray-300 mb-3">Checks</h4>
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-300">All tests passed</span>
            <span className="ml-auto text-xs text-gray-500">2m ago</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-300">Build successful</span>
            <span className="ml-auto text-xs text-gray-500">3m ago</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-300">Lint passed</span>
            <span className="ml-auto text-xs text-gray-500">3m ago</span>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-sm">
        <h4 className="text-sm text-gray-300 mb-3">Activity</h4>
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs">DA</span>
            </div>
            <div className="flex-1">
              <div className="text-sm text-white mb-0.5">
                dev-agent opened this pull request
              </div>
              <div className="text-xs text-gray-500">10 minutes ago</div>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-white mb-0.5">
                All checks passed
              </div>
              <div className="text-xs text-gray-500">2 minutes ago</div>
            </div>
          </div>

          <div className="flex gap-3">
            {(() => {
              const commenterName = 'Jane Doe';
              const commenterColor = getUserColor(commenterName);
              return (
                <div className={`w-6 h-6 rounded-full ${commenterColor.bg} ${commenterColor.text} flex items-center justify-center flex-shrink-0 border border-gray-400`}>
                  <span className="text-xs font-medium">{getUserInitials(commenterName)}</span>
                </div>
              );
            })()}
            <div className="flex-1">
              <div className="text-sm text-white mb-1">
                Jane Doe commented
              </div>
              <div className="bg-gray-900 rounded-lg p-3 text-sm text-gray-300 border border-gray-800">
                Looks great! The validation logic is clean and the error messages are clear.
              </div>
              <div className="text-xs text-gray-500 mt-1">1 minute ago</div>
            </div>
          </div>
        </div>
      </div>

      {/* Merge Button */}
      <button className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
        <GitPullRequest className="w-4 h-4" />
        Merge Pull Request
      </button>
    </div>
  );
}
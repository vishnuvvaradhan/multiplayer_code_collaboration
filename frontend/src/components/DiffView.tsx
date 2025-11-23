import { useEffect, useState } from 'react';
import { FileCode, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';

interface DiffViewProps {
  ticketId: string;
  prLink?: string;
}

interface DiffFile {
  id: string;
  filePath: string;
  diff: string;
  additions: number;
  deletions: number;
}

export function DiffView({ ticketId, prLink }: DiffViewProps) {
  const [diffs, setDiffs] = useState<DiffFile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadDiffs() {
      try {
        setLoading(true);
        setError(null);
        setDiffs([]);
        setSelectedId(null);

        const res = await fetch(`/api/ticket-diffs/${encodeURIComponent(ticketId)}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Request failed with ${res.status}`);
        }
        const body = (await res.json()) as { diffs: DiffFile[] };
        if (!isMounted) return;

        setDiffs(body.diffs || []);
        if (body.diffs && body.diffs.length > 0) {
          setSelectedId(body.diffs[0].id);
        }
      } catch (e) {
        if (!isMounted) return;
        setError(e instanceof Error ? e.message : 'Failed to load diffs');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (ticketId) {
      loadDiffs();
    }

    return () => {
      isMounted = false;
    };
  }, [ticketId]);

  const selectedDiff = diffs.find((d) => d.id === selectedId) || null;

  return (
    <div className="p-6 space-y-4">
      {/* PR Link if available */}
      {prLink && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-medium text-green-900 mb-1">Pull Request Created</h4>
              <p className="text-xs text-green-700">View the full diff and changes on GitHub</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(prLink, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View PR
            </Button>
          </div>
        </div>
      )}

      {/* Files list */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-700">
            Changed Files
          </h3>
          {loading && (
            <span className="text-xs text-gray-500">Loading…</span>
          )}
        </div>

        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-1.5">
            {error}
          </div>
        )}

        {!loading && !error && diffs.length === 0 && (
          <div className="text-xs text-gray-500 py-2">
            No changes detected for this ticket yet.
          </div>
        )}

        {diffs.length > 0 && (
          <div className="flex flex-col gap-1 mt-1">
            {diffs.map((file) => {
              const isSelected = file.id === selectedId;
              return (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => setSelectedId(file.id)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left transition-colors ${
                    isSelected
                      ? 'bg-gray-900 text-white'
                      : 'bg-transparent hover:bg-gray-100 text-gray-800'
                  }`}
                >
                  <FileCode
                    className={`w-3.5 h-3.5 ${
                      isSelected ? 'text-gray-200' : 'text-gray-500'
                    }`}
                  />
                  <span className="truncate flex-1">{file.filePath}</span>
                  <span
                    className={`font-mono ${
                      isSelected ? 'text-green-200' : 'text-green-600'
                    }`}
                  >
                    +{file.additions}
                  </span>
                  <span
                    className={`font-mono ${
                      isSelected ? 'text-red-200' : 'text-red-600'
                    }`}
                  >
                    -{file.deletions}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected diff */}
      {selectedDiff && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden shadow-sm">
          <div className="px-4 py-2 border-b border-gray-800 flex items-center gap-2">
            <FileCode className="w-4 h-4 text-gray-300" />
            <span className="text-xs text-gray-100 truncate">
              {selectedDiff.filePath}
            </span>
            <span className="ml-auto flex items-center gap-3 text-[11px]">
              <span className="text-green-400 font-mono">+{selectedDiff.additions}</span>
              <span className="text-red-400 font-mono">-{selectedDiff.deletions}</span>
            </span>
          </div>
          <div className="p-3 font-mono text-xs overflow-x-auto bg-gray-950">
            {selectedDiff.diff.split('\n').map((line, idx) => {
              let colorClass = 'text-gray-300';
              if (line.startsWith('+') && !line.startsWith('+++')) {
                colorClass = 'text-green-400';
              } else if (line.startsWith('-') && !line.startsWith('---')) {
                colorClass = 'text-red-400';
              } else if (line.startsWith('@@')) {
                colorClass = 'text-amber-300';
              } else if (line.startsWith('diff --git')) {
                colorClass = 'text-blue-300';
              }

              return (
                <div key={idx} className={colorClass}>
                  {line || ' '}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


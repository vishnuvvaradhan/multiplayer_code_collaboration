import { Code, Eye } from 'lucide-react';

interface DiffGeneratedCardProps {
  timestamp: string;
}

export function DiffGeneratedCard({ timestamp }: DiffGeneratedCardProps) {
  return (
    <div className="px-4 py-3 hover:bg-gray-50 group transition-colors border-t border-gray-100">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-purple-500 to-purple-600 border-2 border-white shadow-sm">
          <Code className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-sm text-gray-900">Dev Agent</span>
            <span className="text-xs text-gray-600 bg-gray-200 px-1.5 py-0.5 rounded border border-gray-300">BOT</span>
            <span className="text-xs text-gray-500">{timestamp}</span>
          </div>
          <div className="border border-gray-300 rounded-md p-4 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
              <h3 className="text-gray-900">Code Changes Generated</h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded border border-green-200 font-mono">+47</span>
                <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded border border-red-200 font-mono">-12</span>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-600"></div>
                <span>3 files modified</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-gray-700 bg-gray-100 px-2.5 py-1 rounded border border-gray-300 font-mono">
                  PaymentForm.tsx
                </span>
                <span className="text-xs text-gray-700 bg-gray-100 px-2.5 py-1 rounded border border-gray-300 font-mono">
                  validation.ts
                </span>
                <span className="text-xs text-gray-700 bg-gray-100 px-2.5 py-1 rounded border border-gray-300 font-mono">
                  ErrorMessage.tsx
                </span>
              </div>
            </div>

            <button className="w-full px-3 py-2 bg-gray-100 border border-gray-300 text-gray-800 text-sm rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
              <Eye className="w-4 h-4" />
              View Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
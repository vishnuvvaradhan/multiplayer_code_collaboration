import { Bot, FileCode, CheckCircle } from 'lucide-react';

interface ArchitectPlanCardProps {
  timestamp: string;
}

export function ArchitectPlanCard({ timestamp }: ArchitectPlanCardProps) {
  return (
    <div className="px-4 py-3 hover:bg-gray-50 group transition-colors border-t border-gray-100">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 border-2 border-white shadow-sm">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-sm text-gray-900">Architect</span>
            <span className="text-xs text-gray-600 bg-gray-200 px-1.5 py-0.5 rounded border border-gray-300">BOT</span>
            <span className="text-xs text-gray-500">{timestamp}</span>
          </div>
          <div className="border border-gray-300 rounded-md p-4 bg-white shadow-sm">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="text-gray-900">Implementation Plan Created</h3>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-xs text-gray-700 mb-2 uppercase tracking-wide">Approach</h4>
                <ul className="space-y-2">
                  <li className="text-sm text-gray-800 flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-600 mt-1.5 flex-shrink-0"></div>
                    Create a validation utility with card number, CVV, and expiry validation
                  </li>
                  <li className="text-sm text-gray-800 flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-600 mt-1.5 flex-shrink-0"></div>
                    Build an ErrorMessage component for consistent error display
                  </li>
                  <li className="text-sm text-gray-800 flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-600 mt-1.5 flex-shrink-0"></div>
                    Update PaymentForm to integrate validation on blur and submit
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="text-xs text-gray-700 mb-2 uppercase tracking-wide">Files to modify</h4>
                <div className="flex flex-wrap gap-2">
                  <div className="px-2.5 py-1.5 bg-blue-50 rounded-md text-xs text-blue-700 flex items-center gap-1.5 border border-blue-200">
                    <FileCode className="w-3.5 h-3.5" />
                    PaymentForm.tsx
                  </div>
                  <div className="px-2.5 py-1.5 bg-blue-50 rounded-md text-xs text-blue-700 flex items-center gap-1.5 border border-blue-200">
                    <FileCode className="w-3.5 h-3.5" />
                    validation.ts
                  </div>
                  <div className="px-2.5 py-1.5 bg-blue-50 rounded-md text-xs text-blue-700 flex items-center gap-1.5 border border-blue-200">
                    <FileCode className="w-3.5 h-3.5" />
                    ErrorMessage.tsx
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <button className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                  View full plan in details panel →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
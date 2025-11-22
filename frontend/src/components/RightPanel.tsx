import { useState } from 'react';
import { X, Check, FileCode, GitPullRequest, Clock } from 'lucide-react';
import { DiffView } from './DiffView';
import { PRView } from './PRView';
import { getUserColor, getUserInitials } from '@/lib/database';

interface RightPanelProps {
  ticketId: string;
  onClose: () => void;
}

type Tab = 'plan' | 'changes' | 'pr';

export function RightPanel({ ticketId, onClose }: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('plan');

  return (
    <div className="w-96 border-l border-amber-800/20 flex flex-col shadow-lg" style={{ backgroundColor: '#F5F1EB' }}>
      {/* Header */}
      <div className="h-14 border-b border-amber-800/20 flex items-center justify-between px-4" style={{ backgroundColor: '#F5F1EB' }}>
        <h2 className="text-gray-900">Details</h2>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-md hover:bg-gray-200 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-amber-800/20 px-4" style={{ backgroundColor: '#F5F1EB' }}>
        <div className="flex gap-4">
          {[
            { id: 'plan', label: 'Plan' },
            { id: 'changes', label: 'Changes' },
            { id: 'pr', label: 'PR' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`py-3 px-1 relative transition-colors text-sm ${
                activeTab === tab.id
                  ? 'text-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#F5F1EB' }}>
        {activeTab === 'plan' && <PlanTab />}
        {activeTab === 'changes' && <DiffView />}
        {activeTab === 'pr' && <PRView />}
      </div>
    </div>
  );
}

function PlanTab() {
  return (
    <div className="p-4 space-y-4">
      {/* PRD Card */}
      <div className="bg-white border border-gray-300 rounded-md p-4 shadow-sm">
        <div className="flex items-start justify-between mb-3 pb-3 border-b border-gray-200">
          <div>
            <h3 className="text-gray-900 mb-1">Payment Validation</h3>
            <p className="text-xs text-gray-600">PRD · REL-123</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-xs text-gray-700 mb-2 uppercase tracking-wide">Summary</h4>
            <p className="text-sm text-gray-800">
              Implement comprehensive payment method validation in the checkout flow with user-friendly error messaging.
            </p>
          </div>

          <div>
            <h4 className="text-xs text-gray-700 mb-2 uppercase tracking-wide">Requirements</h4>
            <ul className="space-y-1.5">
              <li className="text-sm text-gray-800 flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-600 mt-1.5"></div>
                Real-time card number validation
              </li>
              <li className="text-sm text-gray-800 flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-600 mt-1.5"></div>
                CVV and expiry date checks
              </li>
              <li className="text-sm text-gray-800 flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-600 mt-1.5"></div>
                Clear error messages per field
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs text-gray-700 mb-2 uppercase tracking-wide">Acceptance Criteria</h4>
            <ul className="space-y-1.5">
              <li className="text-sm text-gray-800 flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                Invalid cards show inline errors
              </li>
              <li className="text-sm text-gray-800 flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                Error messages are specific and actionable
              </li>
              <li className="text-sm text-gray-800 flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                Validation works on blur and submit
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs text-gray-700 mb-2 uppercase tracking-wide">Files</h4>
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
        </div>
      </div>

      {/* Approval Section */}
      <div className="bg-white border border-gray-300 rounded-md p-4 shadow-sm">
        <h4 className="text-xs text-gray-700 mb-3 uppercase tracking-wide">Approvals</h4>
        
        <div className="flex items-center gap-3 mb-3">
          <div className="relative">
            {(() => {
              const approverName = 'Jane Doe';
              const approverColor = getUserColor(approverName);
              return (
                <div className={`w-9 h-9 rounded-full ${approverColor.bg} ${approverColor.text} flex items-center justify-center border border-gray-300 shadow-sm`}>
                  <span className="text-sm font-medium">{getUserInitials(approverName)}</span>
                </div>
              );
            })()}
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-600 rounded-full border-2 border-white flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-white" />
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-900">Jane Doe</div>
            <div className="text-xs text-gray-600">Approved</div>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            {(() => {
              const pendingName = 'Mike Kim';
              const pendingColor = getUserColor(pendingName);
              return (
                <div className={`w-9 h-9 rounded-full ${pendingColor.bg} ${pendingColor.text} flex items-center justify-center border border-gray-300 shadow-sm`}>
                  <span className="text-sm font-medium">{getUserInitials(pendingName)}</span>
                </div>
              );
            })()}
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-gray-300 rounded-full border-2 border-white flex items-center justify-center">
              <Clock className="w-2.5 h-2.5 text-gray-600" />
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-900">Mike Kim</div>
            <div className="text-xs text-gray-600">Pending</div>
          </div>
        </div>

        <button className="w-full px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
          <Check className="w-4 h-4" />
          Approve Plan
        </button>
      </div>
    </div>
  );
}
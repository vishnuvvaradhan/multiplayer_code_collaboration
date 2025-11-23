import { Bell, Search } from 'lucide-react';

export function TopBar() {
  return (
    <div className="h-16 bg-gray-900 flex items-center justify-between px-4 border-b border-gray-800">
      {/* Left: Logo and Search */}
      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 10L10 4L16 10M4 10L10 16L16 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-2xl font-bold text-orange-500 tracking-tight">CodeRoom</span>
        </div>
        
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tickets..."
            className="w-full bg-gray-800 border border-gray-700 rounded-md pl-9 pr-3 py-1.5 text-sm text-white placeholder-gray-400 focus:bg-gray-700 focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Center: Project Name */}
      <div className="flex items-center gap-2">
        <span className="text-gray-300 text-sm">Checkout Revamp</span>
      </div>

      {/* Right: Empty space for balance */}
      <div className="flex-1"></div>
    </div>
  );
}
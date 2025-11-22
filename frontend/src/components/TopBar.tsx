import { Bell, Search } from 'lucide-react';

export function TopBar() {
  return (
    <div className="h-16 bg-gray-900 flex items-center justify-between px-4 border-b border-gray-800">
      {/* Left: Logo and Search */}
      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M4 10L10 4L16 10M4 10L10 16L16 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-white">Relay</span>
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

      {/* Right: User Controls */}
      <div className="flex items-center gap-3 flex-1 justify-end">
        <button className="p-2 hover:bg-gray-800 rounded-md transition-colors relative">
          <Bell className="w-5 h-5 text-gray-400" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full"></span>
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center border-2 border-gray-700">
          <span className="text-white text-sm">JD</span>
        </div>
      </div>
    </div>
  );
}
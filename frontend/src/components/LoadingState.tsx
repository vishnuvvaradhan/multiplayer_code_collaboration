export function LoadingState() {
  return (
    <div className="px-4 py-3 border-t border-gray-100">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 border-2 border-white shadow-sm">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-sm text-gray-900">Architect</span>
            <span className="text-xs text-gray-600 bg-gray-200 px-1.5 py-0.5 rounded border border-gray-300">BOT</span>
            <span className="text-xs text-gray-500">typing...</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
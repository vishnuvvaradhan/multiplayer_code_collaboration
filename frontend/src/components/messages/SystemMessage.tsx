interface SystemMessageProps {
  content: string;
  timestamp: string;
}

export function SystemMessage({ content, timestamp }: SystemMessageProps) {
  return (
    <div className="py-4">
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 bg-gray-100/80 rounded-full border border-gray-200/60 shadow-sm">
          <span className="text-xs text-gray-600 font-medium">{content}</span>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs text-gray-400">{timestamp}</span>
        </div>
      </div>
    </div>
  );
}
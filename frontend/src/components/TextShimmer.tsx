interface TextShimmerProps {
  text: string;
  className?: string;
}

export function TextShimmer({ text, className = '' }: TextShimmerProps) {
  return (
    <span
      className={`relative inline-block bg-clip-text text-transparent bg-gradient-to-r from-gray-400 via-gray-800 to-gray-400 bg-[length:200%_100%] animate-shimmer-text ${className}`}
    >
      {text}
    </span>
  );
}


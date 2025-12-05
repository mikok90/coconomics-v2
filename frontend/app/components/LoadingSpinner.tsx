interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'cyan' | 'white' | 'gray';
}

export default function LoadingSpinner({ size = 'md', color = 'cyan' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3'
  };

  const colorClasses = {
    cyan: 'border-cyan-500 border-t-transparent',
    white: 'border-white border-t-transparent',
    gray: 'border-gray-500 border-t-transparent'
  };

  return (
    <div className="flex items-center justify-center">
      <div
        className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-spin`}
      />
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <LoadingSpinner size="lg" color="cyan" />
      <p className="text-white text-lg mt-4">Loading...</p>
    </div>
  );
}

export function InlineLoader({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <LoadingSpinner size="md" color="cyan" />
      {message && <p className="text-gray-400 text-sm mt-3">{message}</p>}
    </div>
  );
}

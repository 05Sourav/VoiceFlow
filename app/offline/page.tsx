'use client';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1b1a2e] via-[#120f26] to-[#0d091e] flex items-center justify-center p-4">
      <div className="text-center text-white">
        <div className="mb-6">
          <svg 
            className="w-16 h-16 mx-auto mb-4 text-white/60" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5z" 
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">You're Offline</h1>
        <p className="text-white/70 mb-6">
          Please check your internet connection and try again.
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-6 py-3 bg-gradient-to-r from-[#6565cc] to-[#bf7aff] text-white rounded-full font-medium hover:opacity-90 transition-opacity"
        >
          Retry
        </button>
      </div>
    </div>
  );
} 
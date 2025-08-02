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
                            <h1 className="text-2xl font-bold mb-2">Server Unavailable</h1>
        <p className="text-white/70 mb-4">
          The development server is not running. This is normal for local PWAs.
        </p>
        <p className="text-white/50 text-sm mb-6">
          To use the app offline, start the server with &quot;npm start&quot; first, then install the PWA.
        </p>
        <div className="space-x-4">
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-3 bg-gradient-to-r from-[#6565cc] to-[#bf7aff] text-white rounded-full font-medium hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
          <button 
            onClick={() => window.location.href = '/'} 
            className="px-6 py-3 bg-white/10 text-white rounded-full font-medium hover:bg-white/20 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
} 
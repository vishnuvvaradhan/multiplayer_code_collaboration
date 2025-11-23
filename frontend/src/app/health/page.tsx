'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function HealthCheckPage() {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [backendResponse, setBackendResponse] = useState<any>(null);
  const [corsTest, setCorsTest] = useState<'checking' | 'pass' | 'fail'>('checking');
  const [error, setError] = useState<string | null>(null);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  const checkBackend = async () => {
    setBackendStatus('checking');
    setCorsTest('checking');
    setError(null);
    setBackendResponse(null);

    try {
      // Test 1: Simple fetch to health endpoint
      const response = await fetch(`${BACKEND_URL}/`, {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        setBackendResponse(data);
        setBackendStatus('online');
        setCorsTest('pass');
      } else {
        setBackendStatus('offline');
        setError(`Backend returned status: ${response.status}`);
      }
    } catch (err) {
      setBackendStatus('offline');
      setCorsTest('fail');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  useEffect(() => {
    checkBackend();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Backend Health Check</h1>

        {/* Backend URL */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">Backend URL</h2>
          <code className="bg-gray-100 px-3 py-2 rounded block">
            {BACKEND_URL}
          </code>
        </div>

        {/* Backend Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Backend Status</h2>
          
          <div className="space-y-4">
            {/* Connection Status */}
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Connection:</span>
              <div className="flex items-center gap-2">
                {backendStatus === 'checking' && (
                  <>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                    <span className="text-yellow-600">Checking...</span>
                  </>
                )}
                {backendStatus === 'online' && (
                  <>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-green-600 font-semibold">Online ✅</span>
                  </>
                )}
                {backendStatus === 'offline' && (
                  <>
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-red-600 font-semibold">Offline ❌</span>
                  </>
                )}
              </div>
            </div>

            {/* CORS Status */}
            <div className="flex items-center justify-between">
              <span className="text-gray-700">CORS:</span>
              <div className="flex items-center gap-2">
                {corsTest === 'checking' && (
                  <>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                    <span className="text-yellow-600">Checking...</span>
                  </>
                )}
                {corsTest === 'pass' && (
                  <>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-green-600 font-semibold">Configured ✅</span>
                  </>
                )}
                {corsTest === 'fail' && (
                  <>
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-red-600 font-semibold">Failed ❌</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Backend Response */}
          {backendResponse && (
            <div className="mt-4 pt-4 border-t">
              <h3 className="text-sm font-semibold mb-2">Backend Response:</h3>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                {JSON.stringify(backendResponse, null, 2)}
              </pre>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 pt-4 border-t">
              <h3 className="text-sm font-semibold mb-2 text-red-600">Error:</h3>
              <pre className="bg-red-50 p-3 rounded text-xs overflow-auto text-red-800">
                {error}
              </pre>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Actions</h2>
          <div className="space-y-3">
            <Button onClick={checkBackend} className="w-full">
              🔄 Recheck Backend
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.location.href = '/'}
            >
              ← Back to App
            </Button>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-3 text-blue-900">Troubleshooting</h2>
          
          {backendStatus === 'offline' && (
            <div className="space-y-3 text-sm text-blue-800">
              <p className="font-semibold">Backend is offline. Try:</p>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>Make sure backend is running:
                  <code className="block bg-blue-100 px-2 py-1 rounded mt-1 ml-4">
                    cd backend && uvicorn app:app --reload --port 8000
                  </code>
                </li>
                <li>Check if backend is on port 8000:
                  <code className="block bg-blue-100 px-2 py-1 rounded mt-1 ml-4">
                    curl http://localhost:8000/
                  </code>
                </li>
                <li>Verify NEXT_PUBLIC_BACKEND_URL in .env.local:
                  <code className="block bg-blue-100 px-2 py-1 rounded mt-1 ml-4">
                    NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
                  </code>
                </li>
              </ol>
            </div>
          )}

          {corsTest === 'fail' && backendStatus === 'offline' && (
            <div className="space-y-3 text-sm text-blue-800 mt-4">
              <p className="font-semibold">CORS Error. Try:</p>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>Restart backend with --reload flag</li>
                <li>Check app.py has CORS middleware configured</li>
                <li>Hard refresh browser (Cmd+Shift+R)</li>
              </ol>
            </div>
          )}

          {backendStatus === 'online' && corsTest === 'pass' && (
            <div className="text-sm text-green-800">
              <p className="font-semibold">✅ Everything looks good!</p>
              <p className="mt-2">Your backend is running and CORS is configured correctly.</p>
              <p className="mt-2">You can now use the app normally.</p>
            </div>
          )}
        </div>

        {/* System Info */}
        <div className="bg-gray-100 rounded-lg p-4 mt-6 text-xs text-gray-600">
          <h3 className="font-semibold mb-2">System Info</h3>
          <div className="space-y-1">
            <div>Frontend: {window.location.origin}</div>
            <div>Backend: {BACKEND_URL}</div>
            <div>Time: {new Date().toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}


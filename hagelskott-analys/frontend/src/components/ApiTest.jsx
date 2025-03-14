import React, { useEffect, useState } from 'react';

const ApiTest = () => {
  const [status, setStatus] = useState('Testing...');
  const [error, setError] = useState(null);

  useEffect(() => {
    const testApi = async () => {
      try {
        const response = await fetch('http://localhost:8000/health');
        const data = await response.json();
        setStatus(`API Status: ${response.ok ? 'Connected' : 'Failed'}`);
        console.log('API Response:', data);
      } catch (err) {
        setError(err.message);
        console.error('API Error:', err);
      }
    };

    testApi();
  }, []);

  return (
    <div className="p-4 mb-4 bg-gray-100 rounded">
      <h3 className="font-bold">API Debug</h3>
      <p>{status}</p>
      {error && <p className="text-red-500">Error: {error}</p>}
    </div>
  );
};

export default ApiTest;
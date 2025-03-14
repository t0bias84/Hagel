import React from 'react';

const ApiDebug = () => {
  const runTests = async () => {
    // Test basic connectivity
    try {
      const resp = await fetch('http://localhost:8000/health');
      console.log('Health check:', await resp.json());
    } catch (e) {
      console.error('Health check failed:', e);
    }

    // Test forum API
    try {
      const resp = await fetch('http://localhost:8000/api/forum/categories?language=sv');
      console.log('Forum categories:', await resp.json());
    } catch (e) {
      console.error('Forum API failed:', e);
    }
  };

  return (
    <div className="p-4 bg-yellow-100 mb-4">
      <button 
        onClick={runTests}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Run API Tests
      </button>
    </div>
  );
};

export default ApiDebug;
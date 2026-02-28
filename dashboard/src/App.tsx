import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { SecurityFindings } from './components/SecurityFindings';
import { CodeMetrics } from './components/CodeMetrics';
import { QualityGates } from './components/QualityGates';
import { CoverageCharts } from './components/CoverageCharts';
import type { QAInputPackage } from './types/qaPackage';

function App() {
  const [data, setData] = useState<QAInputPackage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getAnalysis();
      if (result) {
        setData(result);
      } else {
        setError('No analysis data found. Please run an analysis first.');
      }
    } catch (err) {
      setError('Failed to load analysis data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLoading(true);
      setError(null);
      try {
        const result = await api.loadFromFile(file);
        if (result) {
          setData(result);
        } else {
          setError('Failed to parse file');
        }
      } catch (err) {
        setError('Failed to load file');
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadAnalysis();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-6 max-w-md">
          <div className="text-red-600 mb-4">{error}</div>
          <div className="space-y-2">
            <button
              onClick={loadAnalysis}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Retry
            </button>
            <label className="block w-full bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 text-center cursor-pointer">
              Upload JSON File
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No analysis data available</p>
          <label className="block w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-center cursor-pointer">
            Upload JSON File
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">QA Monster Dashboard</h1>
          <p className="text-gray-600 mt-1">{data.understanding.target.file}</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-6">
          <QualityGates data={data} />
          <SecurityFindings data={data} />
          <CodeMetrics data={data} />
          <CoverageCharts data={data} />
        </div>
      </main>
    </div>
  );
}

export default App;

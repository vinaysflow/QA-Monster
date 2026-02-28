import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { QAInputPackage } from '../types/qaPackage';

interface Props {
  data: QAInputPackage;
}

export const CodeMetrics: React.FC<Props> = ({ data }) => {
  const complexity = data.understanding.target.complexity;

  const metricsData = [
    {
      name: 'Cyclomatic',
      value: complexity.cyclomatic,
      threshold: 50,
    },
    {
      name: 'Cognitive',
      value: complexity.cognitive,
      threshold: 30,
    },
    {
      name: 'Lines of Code',
      value: complexity.linesOfCode,
      threshold: 1000,
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4">Code Metrics</h3>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600">{complexity.cyclomatic}</div>
          <div className="text-sm text-gray-600">Cyclomatic Complexity</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-purple-600">{complexity.cognitive}</div>
          <div className="text-sm text-gray-600">Cognitive Complexity</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600">{complexity.linesOfCode}</div>
          <div className="text-sm text-gray-600">Lines of Code</div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={metricsData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" fill="#3b82f6" name="Current Value" />
          <Bar dataKey="threshold" fill="#ef4444" name="Threshold" />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4">
        <div className="text-sm text-gray-600">
          <strong>Confidence:</strong> {(data.understanding.confidence * 100).toFixed(1)}%
        </div>
      </div>
    </div>
  );
};

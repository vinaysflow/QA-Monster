import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { QAInputPackage } from '../types/qaPackage';

interface Props {
  data: QAInputPackage;
}

export const CoverageCharts: React.FC<Props> = ({ data }) => {
  const coverage = data.coverage?.report;

  if (!coverage) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4">Test Coverage</h3>
        <p className="text-gray-600">No coverage data available</p>
      </div>
    );
  }

  const pieData = [
    { name: 'Covered', value: coverage.total.lines.percentage },
    { name: 'Uncovered', value: 100 - coverage.total.lines.percentage },
  ];

  const COLORS = ['#10b981', '#ef4444'];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4">Test Coverage</h3>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h4 className="font-semibold mb-2">Line Coverage</h4>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2">
          <div>
            <div className="flex justify-between">
              <span>Lines:</span>
              <span className="font-semibold">{coverage.total.lines.percentage.toFixed(1)}%</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between">
              <span>Statements:</span>
              <span className="font-semibold">{coverage.total.statements.percentage.toFixed(1)}%</span>
            </div>
          </div>
          {data.coverage.gaps && data.coverage.gaps.length > 0 && (
            <div className="mt-4">
              <h5 className="font-semibold mb-2">Coverage Gaps:</h5>
              <div className="space-y-1 text-sm">
                {data.coverage.gaps.slice(0, 5).map((gap, idx) => (
                  <div key={idx} className="text-gray-600">
                    {gap.file}: {gap.recommendation}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

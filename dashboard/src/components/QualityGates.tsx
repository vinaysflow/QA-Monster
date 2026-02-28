import React from 'react';
import type { QAInputPackage } from '../types/qaPackage';

interface Props {
  data: QAInputPackage;
}

export const QualityGates: React.FC<Props> = ({ data }) => {
  const qualityGate = data.qualityGate;

  if (!qualityGate) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4">Quality Gate Status</h3>
      <div className={`p-4 rounded-lg ${qualityGate.passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">
              {qualityGate.passed ? '✅ PASSED' : '❌ FAILED'}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {qualityGate.summary.passed} of {qualityGate.summary.total} rules passed
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold">
              {qualityGate.summary.failed > 0 && (
                <span className="text-red-600">{qualityGate.summary.failed} failed</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

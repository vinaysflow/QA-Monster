import React from 'react';
import type { QAInputPackage } from '../types/qaPackage';

interface Props {
  data: QAInputPackage;
}

export const SecurityFindings: React.FC<Props> = ({ data }) => {
  const sca = data.security?.sca;
  const sast = data.security?.sast;

  if (!sca && !sast) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-green-800">✅ No security vulnerabilities found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sca && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold mb-4">Dependency Vulnerabilities (SCA)</h3>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-red-50 p-3 rounded">
              <div className="text-2xl font-bold text-red-600">{sca.summary.critical}</div>
              <div className="text-sm text-red-700">Critical</div>
            </div>
            <div className="bg-orange-50 p-3 rounded">
              <div className="text-2xl font-bold text-orange-600">{sca.summary.high}</div>
              <div className="text-sm text-orange-700">High</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded">
              <div className="text-2xl font-bold text-yellow-600">{sca.summary.medium}</div>
              <div className="text-sm text-yellow-700">Medium</div>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <div className="text-2xl font-bold text-blue-600">{sca.summary.low}</div>
              <div className="text-sm text-blue-700">Low</div>
            </div>
          </div>
          {sca.vulnerabilities.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Vulnerabilities:</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {sca.vulnerabilities.slice(0, 10).map((vuln) => (
                  <div key={vuln.id} className="border-l-4 border-red-500 pl-3 py-2 bg-gray-50">
                    <div className="font-medium">{vuln.package}@{vuln.version}</div>
                    <div className="text-sm text-gray-600">{vuln.description}</div>
                    {vuln.fixVersion && (
                      <div className="text-sm text-green-600 mt-1">
                        Fix: Update to {vuln.fixVersion}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {sast && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold mb-4">Code-Level Vulnerabilities (SAST)</h3>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-red-50 p-3 rounded">
              <div className="text-2xl font-bold text-red-600">{sast.summary.critical}</div>
              <div className="text-sm text-red-700">Critical</div>
            </div>
            <div className="bg-orange-50 p-3 rounded">
              <div className="text-2xl font-bold text-orange-600">{sast.summary.high}</div>
              <div className="text-sm text-orange-700">High</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded">
              <div className="text-2xl font-bold text-yellow-600">{sast.summary.medium}</div>
              <div className="text-sm text-yellow-700">Medium</div>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <div className="text-2xl font-bold text-blue-600">{sast.summary.low}</div>
              <div className="text-sm text-blue-700">Low</div>
            </div>
          </div>
          {sast.findings.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Findings:</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {sast.findings.slice(0, 10).map((finding, idx) => (
                  <div key={idx} className="border-l-4 border-orange-500 pl-3 py-2 bg-gray-50">
                    <div className="font-medium">{finding.patternName}</div>
                    <div className="text-sm text-gray-600">
                      {finding.file}:{finding.line} - {finding.message}
                    </div>
                    <div className="text-sm text-blue-600 mt-1">
                      💡 {finding.recommendation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * API service for QA Monster
 */

import axios from 'axios';
import type { QAInputPackage } from '../types/qaPackage';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = {
  /**
   * Get analysis results
   */
  async getAnalysis(filePath?: string): Promise<QAInputPackage | null> {
    try {
      if (filePath) {
        const response = await axios.post(`${API_BASE_URL}/api/analyze`, { file: filePath });
        return response.data;
      } else {
        // Load from local file
        const response = await axios.get('/qa-output/qa-output.json');
        return response.data;
      }
    } catch (error) {
      console.error('Failed to fetch analysis:', error);
      return null;
    }
  },

  /**
   * Load analysis from JSON file
   */
  async loadFromFile(file: File): Promise<QAInputPackage | null> {
    try {
      const text = await file.text();
      return JSON.parse(text);
    } catch (error) {
      console.error('Failed to load file:', error);
      return null;
    }
  },
};

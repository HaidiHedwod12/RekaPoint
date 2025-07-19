import React, { useState, useEffect } from 'react';
import { getAllReimbursementRequests, createReimbursementRequest, type ReimbursementRequest } from '../../lib/reimbursement';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';

export const TestReimbursement: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ReimbursementRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getAllReimbursementRequests();
      setRequests(data);
      console.log('Reimbursement data:', data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const testCreate = async () => {
    if (!user) return;
    
    try {
      const testRequest = {
        title: 'Test Reimbursement',
        description: 'Test pengajuan reimbursement',
        items: [
          {
            description: 'Test item',
            amount: 50000,
            category: 'Transportasi',
            date: '2025-01-17'
          }
        ]
      };

      const result = await createReimbursementRequest(testRequest, user);
      console.log('Created request:', result);
      await loadData(); // Reload data
    } catch (error) {
      console.error('Error creating test request:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Reimbursement Database</h1>
      
      <div className="space-y-4">
        <Button onClick={loadData} disabled={loading}>
          {loading ? 'Loading...' : 'Load Data'}
        </Button>
        
        <Button onClick={testCreate} className="bg-green-600">
          Create Test Request
        </Button>
        
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">Data ({requests.length} items):</h2>
          <pre className="bg-gray-800 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(requests, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}; 
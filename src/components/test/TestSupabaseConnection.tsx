import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';

// Fungsi login Supabase Auth (gunakan email & password user yang sudah ada di Supabase Auth)
export async function loginSupabase(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    alert('Login gagal: ' + error.message);
    return false;
  }
  alert('Login berhasil sebagai: ' + email);
  return true;
}

export const TestSupabaseConnection: React.FC = () => {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const testConnection = async () => {
    setLoading(true);
    const testResults: any = {};

    try {
      // Test 1: Basic connection
      console.log('Testing basic Supabase connection...');
      const { data, error } = await supabase.from('users').select('count').limit(1);
      testResults.basicConnection = { success: !error, data, error };
      console.log('Basic connection result:', { data, error });

      // Test 2: Check if tables exist
      console.log('Testing table existence...');
      const { data: requestsData, error: requestsError } = await supabase
        .from('reimbursement_requests')
        .select('count')
        .limit(1);
      testResults.reimbursementRequestsTable = { success: !requestsError, data: requestsData, error: requestsError };
      console.log('reimbursement_requests table result:', { data: requestsData, error: requestsError });

      const { data: itemsData, error: itemsError } = await supabase
        .from('reimbursement_items')
        .select('count')
        .limit(1);
      testResults.reimbursementItemsTable = { success: !itemsError, data: itemsData, error: itemsError };
      console.log('reimbursement_items table result:', { data: itemsData, error: itemsError });

      // Test 3: Check RLS policies
      console.log('Testing RLS policies...');
      
      // Use the known working user ID from manual test
      const validUserId = '046e6e18-87bb-4471-a05a-bc5927d7b81e';
      console.log('Using known valid user ID for test:', validUserId);
      
      const { data: insertTest, error: insertError } = await supabase
        .from('reimbursement_requests')
        .insert({
          user_id: validUserId,
          title: 'Test Request from React',
          description: 'Test description from React app',
          total_amount: 150000,
          status: 'pending'
        })
        .select();
      testResults.insertPolicy = { success: !insertError, data: insertTest, error: insertError };
      console.log('Insert policy result:', { data: insertTest, error: insertError });

      // Test 4: Check storage bucket
      console.log('Testing storage bucket...');
      const { data: storageData, error: storageError } = await supabase.storage
        .from('reimbursement-receipts')
        .list();
      testResults.storageBucket = { success: !storageError, data: storageData, error: storageError };
      console.log('Storage bucket result:', { data: storageData, error: storageError });

      // Test 5: Check environment variables
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      testResults.envVars = { 
        success: !!(supabaseUrl && supabaseKey),
        supabaseUrl: supabaseUrl ? 'Set' : 'Not Set',
        supabaseKey: supabaseKey ? 'Set' : 'Not Set'
      };

      // Test 6: Check user_documents table
      console.log('Testing user_documents table...');
      const { data: userDocsData, error: userDocsError } = await supabase
        .from('user_documents')
        .select('count')
        .limit(1);
      testResults.userDocumentsTable = { success: !userDocsError, data: userDocsData, error: userDocsError };
      console.log('user_documents table result:', { data: userDocsData, error: userDocsError });

      // Test 7: Check user-documents storage bucket
      console.log('Testing user-documents storage bucket...');
      const { data: userDocsStorage, error: userDocsStorageError } = await supabase.storage
        .from('user-documents')
        .list();
      testResults.userDocumentsStorage = { success: !userDocsStorageError, data: userDocsStorage, error: userDocsStorageError };
      console.log('user-documents storage result:', { data: userDocsStorage, error: userDocsStorageError });

      // Test 8: Update user profile (simulasi update nama)
      console.log('Testing update user profile...');
      const testUserId = results.basicConnection?.data?.[0]?.id || null;
      // Cari satu user id dari tabel users
      let userIdToUpdate = null;
      try {
        // Cari user dengan username = 'testuser' saja
        const { data: usersList } = await supabase.from('users').select('id').eq('username', 'testuser').limit(1);
        if (!usersListError && usersList && usersList.length > 0) {
          userIdToUpdate = usersList[0].id;
        }
      } catch (e) {}
      if (userIdToUpdate) {
        const newName = 'Test Update ' + Math.floor(Math.random() * 10000);
        const { error: updateUserError } = await supabase
          .from('users')
          .update({ nama: newName })
          .eq('id', userIdToUpdate);
        // Cek apakah update benar-benar masuk
        let updatedName = null;
        let fetchError = null;
        try {
          const { data: updatedUser, error: fetchErr } = await supabase.from('users').select('nama').eq('id', userIdToUpdate).single();
          updatedName = updatedUser?.nama;
          fetchError = fetchErr;
        } catch (e) { fetchError = e; }
        testResults.updateUserProfile = {
          success: !updateUserError && !fetchError && updatedName && updatedName.startsWith('Test Update'),
          updatedName,
          updateUserError: updateUserError ? JSON.stringify(updateUserError, null, 2) : null,
          fetchError: fetchError ? JSON.stringify(fetchError, null, 2) : null,
          userIdToUpdate,
          attemptedName: newName
        };
        console.log('Update user profile result:', testResults.updateUserProfile);
      } else {
        testResults.updateUserProfile = { success: false, error: 'Tidak bisa menemukan user id untuk test update' };
      }

      // Test 9: Upload file dummy ke user-documents
      console.log('Testing upload to user-documents bucket...');
      let uploadError = null;
      let uploadSuccess = false;
      try {
        // Buat file dummy (Blob)
        const fileContent = new Blob(['Hello Supabase!'], { type: 'text/plain' });
        const fileName = `test-upload-${Date.now()}.txt`;
        const filePath = `test/${fileName}`;
        const { error: uploadErr } = await supabase.storage
          .from('user-documents')
          .upload(filePath, fileContent, { upsert: true });
        uploadError = uploadErr;
        uploadSuccess = !uploadErr;
      } catch (e) {
        uploadError = e;
        uploadSuccess = false;
      }
      testResults.uploadUserDocuments = {
        success: uploadSuccess,
        error: uploadError ? JSON.stringify(uploadError, null, 2) : null
      };
      console.log('Upload user-documents result:', testResults.uploadUserDocuments);

    } catch (error) {
      console.error('Test error:', error);
      testResults.generalError = error;
    }

    setResults(testResults);
    setLoading(false);
  };

  const clearTestData = async () => {
    try {
      const { error } = await supabase.from('reimbursement_requests').delete().eq('title', 'Test Request');
      if (error) throw error;
      console.log('Test data cleared');
      alert('Test data berhasil dihapus!');
    } catch (error) {
      console.error('Error clearing test data:', error);
      alert('Error menghapus test data: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
      
      {/* Form login Supabase Auth */}
      <div className="mb-6 space-y-2">
        <input
          type="email"
          placeholder="Email Supabase Auth"
          value={loginEmail}
          onChange={e => setLoginEmail(e.target.value)}
          className="px-3 py-2 rounded border"
        />
        <input
          type="password"
          placeholder="Password"
          value={loginPassword}
          onChange={e => setLoginPassword(e.target.value)}
          className="px-3 py-2 rounded border ml-2"
        />
        <button
          onClick={async () => {
            await loginSupabase(loginEmail, loginPassword);
          }}
          className="ml-2 px-4 py-2 bg-blue-600 text-white rounded"
        >
          Login Supabase Auth
        </button>
      </div>

      <div className="space-y-4 mb-6">
        <Button onClick={testConnection} disabled={loading} className="bg-blue-600">
          {loading ? 'Testing...' : 'Run All Tests'}
        </Button>
        
        <Button onClick={clearTestData} className="bg-red-600">
          Clear Test Data
        </Button>
      </div>

      <div className="space-y-4">
        {Object.entries(results).map(([testName, result]: [string, any]) => (
          <div key={testName} className="border border-gray-600 rounded-lg p-4">
            <h3 className="font-semibold mb-2">{testName}</h3>
            <div className={`text-sm ${result.success ? 'text-green-400' : 'text-red-400'}`}>
              Status: {result.success ? 'SUCCESS' : 'FAILED'}
            </div>
            {result.error && (
              <div className="text-red-400 text-sm mt-2">
                Error: {JSON.stringify(result.error, null, 2)}
              </div>
            )}
            {result.data && (
              <div className="text-gray-400 text-sm mt-2">
                Data: {JSON.stringify(result.data, null, 2)}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gray-800 rounded-lg">
        <h3 className="font-semibold mb-2">Environment Variables:</h3>
        <pre className="text-sm">
          {JSON.stringify(results.envVars || {}, null, 2)}
        </pre>
      </div>
    </div>
  );
}; 
'use client';

import { useState } from 'react';
import { useSupabase } from '../components/supabase-provider';
import AuthForm from '../components/auth-form';
import Display from '../components/Display';

export default function Home() {
  const { session, supabase } = useSupabase();
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
      setFilename(event.target.files[0].name);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || !session) {
      setError('Please select a file and ensure you are logged in.');
      return;
    }

    setLoading(true);
    setError(null);
    setExtractedText('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'File upload failed');
      }

      const data = await response.json();

      // 🔹 Print full response in frontend console
      console.log('API Response:', data);

      // 🔹 Use extractedText from backend
      setExtractedText(data.extractedText);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setExtractedText('');
    setFile(null);
    setFilename('');
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gradient-to-br from-blue-50 to-indigo-100">
      <h1 className="text-4xl font-bold mb-8 text-gray-800">Legal Document Analyzer</h1>

      {!session ? (
        <AuthForm />
      ) : (
        <div className="w-full max-w-2xl bg-white p-6 rounded-lg shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <p className="text-gray-600">Welcome, {session.user?.email}!</p>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
            >
              Logout
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label htmlFor="document-upload" className="block text-gray-700 font-medium">
              Upload Document (PDF, DOCX, TXT, Images):
            </label>
            <input
              id="document-upload"
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.docx,.txt,.jpeg,.jpg,.png"
              className="block w-full text-sm text-gray-500
                         file:mr-4 file:py-2 file:px-4
                         file:rounded-full file:border-0
                         file:text-sm file:font-semibold
                         file:bg-blue-50 file:text-blue-700
                         hover:file:bg-blue-100 cursor-pointer"
            />
            {file && <p className="text-sm text-gray-600">Selected file: {file.name}</p>}

            <button
              type="submit"
              disabled={!file || loading}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md
                         hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Analyze Document'}
            </button>
          </form>

          {error && <p className="text-red-500 mt-4">{error}</p>}

          {extractedText && (
            <Display text={extractedText} filename={filename} />
          )}
        </div>
      )}
    </main>
  );
}

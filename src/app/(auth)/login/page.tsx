'use client';
// ... (imports remain the same)
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAuth = async (action: 'signIn' | 'signUp') => {
    setLoading(true);
    const authMethod = action === 'signIn' 
      ? supabase.auth.signInWithPassword 
      : supabase.auth.signUp;

    const { error } = await authMethod({ email, password });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(action === 'signIn' ? 'Signed in!' : 'Check email for confirmation!');
      if(action === 'signIn') router.push('/');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-center text-white">Sign In / Sign Up</h1>
        <div className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full px-4 py-2 text-gray-200 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-4 py-2 text-gray-200 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={() => handleAuth('signIn')} disabled={loading} className="flex-1 px-4 py-2 font-bold text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:bg-gray-500 transition-colors">Sign In</button>
            <button onClick={() => handleAuth('signUp')} disabled={loading} className="flex-1 px-4 py-2 font-bold text-white bg-pink-600 rounded-md hover:bg-pink-700 disabled:bg-gray-500 transition-colors">Sign Up</button>
        </div>
      </div>
    </div>
  );
}
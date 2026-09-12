import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { KeyIcon, UserIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

const api = {
  async login(username: string, password: string) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Login failed');
    }
    
    return data.data;
  }
};

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const mutation = useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) => 
      api.login(username, password),
    onSuccess: (data) => {
      // Store auth data
      localStorage.setItem('token', data.token);
      localStorage.setItem('sessionId', data.sessionId);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      toast.success(`Welcome back, ${data.user.fullName}!`);
      navigate('/');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Login failed. Please check your credentials.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ username, password });
  };

  const defaultCredentials = [
    { role: 'Admin', username: 'admin', password: 'admin123' },
    { role: 'Operator', username: 'operator', password: 'operator123' },
    { role: 'Supervisor', username: 'supervisor', password: 'supervisor123' },
    { role: 'Quality', username: 'quality', password: 'quality123' }
  ];

  const fillCredentials = (username: string, password: string) => {
    setUsername(username);
    setPassword(password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 via-green-700 to-green-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4">
            <svg className="w-12 h-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Battery ERP</h1>
          <p className="text-green-100">Shop Floor Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Sign In</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div>
              <label className="label">Username</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  className="input pl-10"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  disabled={mutation.isPending}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <KeyIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pl-10 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={mutation.isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full btn-primary py-3 text-lg flex items-center justify-center gap-2"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRightOnRectangleIcon className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Login */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-3 font-medium">Quick Login (Demo):</p>
            <div className="grid grid-cols-2 gap-2">
              {defaultCredentials.map((cred) => (
                <button
                  key={cred.role}
                  onClick={() => fillCredentials(cred.username, cred.password)}
                  className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors text-left"
                >
                  <span className="font-medium">{cred.role}</span>
                  <br />
                  <span className="text-gray-500">{cred.username}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-green-100 text-sm mt-6">
          © 2024 Battery Recycling Company. All rights reserved.
        </p>
      </div>
    </div>
  );
}

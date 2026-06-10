import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md mx-4">
        <h2 className="text-3xl font-bold mb-2 text-center text-gray-800">Welcome Back</h2>
        <p className="text-gray-400 text-center mb-8">Sign in to your account</p>
        {error && <p className="text-red-500 bg-red-50 p-3 rounded-xl mb-4 text-sm">{error}</p>}
        <input
          type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3.5 border border-gray-200 rounded-xl mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" required
        />
        <input
          type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3.5 border border-gray-200 rounded-xl mb-6 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" required
        />
        <button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3.5 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-md cursor-pointer">
          Sign In
        </button>
        <p className="mt-6 text-center text-gray-500">
          Don't have an account? <Link to="/register" className="text-blue-600 font-medium hover:text-blue-700">Register</Link>
        </p>
      </form>
    </div>
  );
}

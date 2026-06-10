import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatar, setAvatar] = useState(null);

  const updateProfile = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    if (avatar) formData.append('avatar', avatar);
    const res = await api.put('/auth/profile', formData);
    setUser(res.data.user);
    alert('Profile updated!');
  };

  const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>
      <form onSubmit={updateProfile} className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center gap-4 mb-6">
          {user?.avatar ? (
            <img src={`${serverUrl}/uploads/${user.avatar}`} alt="Avatar" className="w-20 h-20 rounded-full object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-lg font-semibold">{user?.name}</p>
            <p className="text-gray-500">{user?.email}</p>
          </div>
        </div>
        <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)}
          className="w-full p-3 border rounded mb-3" required />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border rounded mb-3" required />
        <input type="file" accept="image/*" onChange={(e) => setAvatar(e.target.files[0])}
          className="w-full p-3 border rounded mb-4" />
        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 cursor-pointer">
          Save Changes
        </button>
      </form>
    </div>
  );
}

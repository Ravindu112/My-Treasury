import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function Profile() {
  const { user, profile, updateProfile } = useAuth();
  const [name, setName] = useState(profile?.name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [avatar, setAvatar] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar || null);

  const getAvatarUrl = (path) => {
    if (!path) return null;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let avatarPath = profile?.avatar;
    if (avatar) {
      const ext = avatar.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatar);
      if (uploadError) throw uploadError;
      avatarPath = filePath;
    }
    await updateProfile({ name, email, avatar: avatarPath });
    if (avatarPath) setAvatarUrl(getAvatarUrl(avatarPath));
    alert('Profile updated!');
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center gap-4 mb-6">
          {avatarUrl ? (
            <img src={getAvatarUrl(avatarUrl)} alt="Avatar" className="w-20 h-20 rounded-full object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
              {profile?.name?.charAt(0)?.toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-lg font-semibold">{profile?.name}</p>
            <p className="text-gray-500">{profile?.email}</p>
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

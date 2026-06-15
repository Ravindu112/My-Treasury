import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import Loading from '../components/Loading';

export default function Dashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [totalBudget, setTotalBudget] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('project_members')
      .select('role, projects(*)')
      .eq('user_id', user.id);
    const mapped = (data || []).map((m) => ({ ...m.projects, role: m.role }));
    setProjects(mapped);
    setLoading(false);
  };

  useEffect(() => { fetchProjects(); }, [user.id]);

  const createProject = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const budget = parseFloat(totalBudget) || 0;
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({ name, description, total_budget: budget, remaining_budget: budget, created_by: user.id })
        .select()
        .single();
      if (projectError) throw projectError;
      const { error: memberError } = await supabase.from('project_members').insert({
        project_id: project.id,
        user_id: user.id,
        role: 'treasurer',
      });
      if (memberError) throw memberError;
      setShowModal(false);
      setName('');
      setDescription('');
      setTotalBudget('');
      fetchProjects();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const deleteProject = async (e, projectId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this project? This action cannot be undone.')) return;
    await supabase.from('projects').delete().eq('id', projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">My Projects</h1>
        <button onClick={() => setShowModal(true)}
          className="self-start sm:self-auto bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium cursor-pointer">
          + New Project
        </button>
      </div>
      {loading ? (
        <Loading text="Loading projects" />
      ) : projects.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 text-lg">No projects yet.</p>
          <p className="text-gray-400 mt-1">Create one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {projects.map((p) => (
            <div key={p.id} className="relative bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 group border border-gray-100">
              <Link to={`/projects/${p.id}`} className="block p-5 sm:p-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2 truncate">{p.name}</h3>
                <p className="text-gray-500 text-sm mb-4 line-clamp-2">{p.description}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Budget</span>
                    <span className="font-semibold text-gray-800">LKR {p.total_budget?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Remaining</span>
                    <span className="font-semibold text-emerald-600">LKR {p.remaining_budget?.toFixed(2)}</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                    {p.role.replace('_', ' ')}
                  </span>
                </div>
              </Link>
              {p.role === 'treasurer' && (
                <button onClick={(e) => deleteProject(e, p.id)}
                  className="absolute top-3 right-3 sm:opacity-0 sm:group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs font-medium px-2 py-1 rounded bg-white/80 backdrop-blur-sm transition-all duration-200 cursor-pointer">
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={createProject} className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">New Project</h2>
            <input type="text" placeholder="Project Name" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full p-3.5 border border-gray-200 rounded-xl mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" required />
            <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3.5 border border-gray-200 rounded-xl mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" rows="3" />
            <input type="number" step="0.01" placeholder="Total Budget (LKR)" value={totalBudget} onChange={(e) => setTotalBudget(e.target.value)}
              className="w-full p-3.5 border border-gray-200 rounded-xl mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
            {error && (
              <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <button type="submit" disabled={creating}
                className="w-full sm:flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium cursor-pointer shadow-md order-2 sm:order-1 disabled:opacity-50 disabled:cursor-not-allowed">
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button type="button" onClick={() => setShowModal(false)}
                className="w-full sm:flex-1 bg-gray-100 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium cursor-pointer order-1 sm:order-2">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

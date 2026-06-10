import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';

export default function ProjectDetail() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [newBudget, setNewBudget] = useState('');
  const [budgetReason, setBudgetReason] = useState('');
  const [taskName, setTaskName] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskCost, setTaskCost] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('member');
  const [error, setError] = useState('');
  const [errorModal, setErrorModal] = useState('');

  const fetchProject = async () => {
    setError('');
    const { data, error: fetchError } = await supabase
      .from('projects')
      .select(`
        *,
        project_members(
          id, role, user_id,
          profiles:user_id(id, name, email, avatar)
        ),
        tasks(
          *,
          assignee:assigned_to(id, name, email, avatar)
        ),
        budget_logs(
          *,
          changer:changed_by(id, name)
        )
      `)
      .eq('id', projectId)
      .single();
    if (fetchError) {
      setError(fetchError.message || 'Failed to load project');
      return;
    }
    const transformed = {
      ...data,
      ProjectMembers: data.project_members?.map(m => ({ ...m, User: m.profiles })),
      Tasks: data.tasks?.map(t => ({ ...t, assignee: t.assignee })),
      BudgetLogs: data.budget_logs?.map(l => ({ ...l, changer: l.changer })),
    };
    setProject(transformed);
  };

  useEffect(() => { fetchProject(); }, [projectId]);

  const myRole = project?.ProjectMembers?.find((m) => m.user_id === user.id)?.role;
  const canManage = myRole === 'treasurer' || myRole === 'sub_treasurer';
  const isTreasurer = myRole === 'treasurer';
  const myTasks = project?.Tasks?.filter((t) => t.assigned_to === user.id) || [];
  const myTotalAllocated = myTasks.reduce((sum, t) => sum + (t.allocated_cost || 0), 0);
  const myTotalUsed = myTasks.reduce((sum, t) => sum + (t.spent || 0), 0);
  const myTotalRemaining = myTotalAllocated - myTotalUsed;

  const updateBudget = async (e) => {
    e.preventDefault();
    try {
      const prevTotal = project.total_budget;
      const newTotal = parseFloat(newBudget);
      const { data: tasks } = await supabase.from('tasks').select('allocated_cost').eq('project_id', project.id);
      const totalAllocated = tasks.reduce((sum, t) => sum + (t.allocated_cost || 0), 0);
      if (newTotal < totalAllocated) {
        setErrorModal('Total budget cannot be less than already allocated amount.');
        return;
      }
      await supabase.from('projects').update({
        total_budget: newTotal,
        remaining_budget: newTotal - totalAllocated,
      }).eq('id', project.id);
      await supabase.from('budget_logs').insert({
        project_id: project.id,
        previous_total: prevTotal,
        new_total: newTotal,
        changed_by: user.id,
        reason: budgetReason,
      });
      setShowBudgetModal(false);
      setNewBudget('');
      setBudgetReason('');
      fetchProject();
    } catch (err) {
      setErrorModal(err.message || 'Failed to update budget.');
    }
  };

  const createTask = async (e) => {
    e.preventDefault();
    try {
      const cost = parseFloat(taskCost);
      const { data: tasks } = await supabase.from('tasks').select('allocated_cost').eq('project_id', project.id);
      const totalAllocated = tasks.reduce((sum, t) => sum + (t.allocated_cost || 0), 0);
      const available = project.total_budget - totalAllocated;
      if (cost > available) {
        setErrorModal('Allocated cost exceeds remaining budget.');
        return;
      }
      await supabase.from('tasks').insert({
        project_id: project.id,
        name: taskName,
        description: taskDesc,
        allocated_cost: cost,
        assigned_to: taskAssignee ? taskAssignee : null,
      });
      await supabase.from('projects').update({
        remaining_budget: project.total_budget - totalAllocated - cost,
      }).eq('id', project.id);
      setShowTaskModal(false);
      setTaskName('');
      setTaskDesc('');
      setTaskCost('');
      setTaskAssignee('');
      fetchProject();
    } catch (err) {
      setErrorModal(err.message || 'Failed to create task.');
    }
  };

  const addMember = async (e) => {
    e.preventDefault();
    try {
      const { data: users } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('email', memberEmail);
      const found = users?.[0];
      if (!found) return alert('User not found. They must register first.');
      await supabase.from('project_members').insert({
        project_id: project.id,
        user_id: found.id,
        role: memberRole,
      });
      setShowMemberModal(false);
      setMemberEmail('');
      setMemberRole('member');
      fetchProject();
    } catch (err) {
      alert(err.message || 'Failed to add member');
    }
  };

  if (error) return <div className="p-6"><p className="text-red-500">Error: {error}</p><Link to="/" className="text-blue-600 mt-2 inline-block">&larr; Back to Projects</Link></div>;
  if (!project) return <Loading text="Loading project" />;

  const deleteProject = async () => {
    if (!confirm('Delete this project? This action cannot be undone.')) return;
    await supabase.from('projects').delete().eq('id', project.id);
    window.location.href = '/';
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <Link to="/" className="text-blue-600 hover:text-blue-700 mb-3 sm:mb-4 inline-flex items-center gap-1 text-sm font-medium">&larr; Back to Projects</Link>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6 mt-1 sm:mt-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 break-words">{project.name}</h1>
            {isTreasurer && (
              <button onClick={deleteProject}
                className="text-red-400 hover:text-red-600 text-xs font-medium px-2.5 py-1 rounded-full border border-red-200 hover:border-red-300 transition cursor-pointer whitespace-nowrap">
                Delete Project
              </button>
            )}
          </div>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">{project.description}</p>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 mt-2">
            {myRole?.replace('_', ' ')}
          </span>
        </div>
        <div className="w-full sm:w-auto">
          {isTreasurer ? (
            <div className="text-left sm:text-right bg-gradient-to-br from-gray-50 to-blue-50 p-4 sm:p-5 rounded-2xl">
              <p className="text-2xl sm:text-3xl font-bold text-gray-800">LKR {project.total_budget?.toFixed(2)}</p>
              <p className="text-sm text-gray-500 mt-1">Remaining: <span className={project.remaining_budget < 0 ? 'text-red-500 font-semibold' : 'text-emerald-600 font-semibold'}>LKR {project.remaining_budget?.toFixed(2)}</span></p>
            </div>
          ) : (
            <div className="text-left sm:text-right bg-gradient-to-br from-purple-50 to-pink-50 p-4 sm:p-5 rounded-2xl">
              <p className="text-2xl sm:text-3xl font-bold text-purple-700">LKR {myTotalAllocated?.toFixed(2)}</p>
              <p className="text-sm text-gray-500 mt-1">Used: <span className="text-red-500 font-semibold">LKR {myTotalUsed?.toFixed(2)}</span> &middot; Remaining: <span className={myTotalRemaining < 0 ? 'text-red-500 font-semibold' : 'text-emerald-600 font-semibold'}>LKR {myTotalRemaining?.toFixed(2)}</span></p>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {['overview', 'tasks', 'members', ...(canManage ? ['budget'] : [])].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 capitalize px-3 sm:px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer whitespace-nowrap ${activeTab === tab ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div>
          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">Budget Overview</h2>
            {canManage ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="p-4 sm:p-5 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl">
                    <p className="text-xs sm:text-sm text-blue-600 font-medium mb-1">Total Budget</p>
                    <p className="text-lg sm:text-2xl font-bold text-blue-700 break-all">LKR {project.total_budget?.toFixed(2)}</p>
                  </div>
                  <div className="p-4 sm:p-5 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl">
                    <p className="text-xs sm:text-sm text-emerald-600 font-medium mb-1">Allocated</p>
                    <p className="text-lg sm:text-2xl font-bold text-emerald-700 break-all">LKR {(project.total_budget - project.remaining_budget)?.toFixed(2)}</p>
                  </div>
                  <div className="p-4 sm:p-5 bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-2xl col-span-2 sm:col-span-1">
                    <p className="text-xs sm:text-sm text-amber-600 font-medium mb-1">Remaining</p>
                    <p className="text-lg sm:text-2xl font-bold text-amber-700 break-all">LKR {project.remaining_budget?.toFixed(2)}</p>
                  </div>
                </div>
                {!isTreasurer && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mt-5 pt-5 border-t border-gray-100">
                    <div className="p-4 sm:p-5 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl">
                      <p className="text-xs sm:text-sm text-purple-600 font-medium mb-1">My Total Allocation</p>
                      <p className="text-lg sm:text-2xl font-bold text-purple-700 break-all">LKR {myTotalAllocated?.toFixed(2)}</p>
                    </div>
                    <div className="p-4 sm:p-5 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-2xl">
                      <p className="text-xs sm:text-sm text-orange-600 font-medium mb-1">Used</p>
                      <p className="text-lg sm:text-2xl font-bold text-orange-700 break-all">LKR {myTotalUsed?.toFixed(2)}</p>
                    </div>
                    <div className="p-4 sm:p-5 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl col-span-2 sm:col-span-1">
                      <p className="text-xs sm:text-sm text-emerald-600 font-medium mb-1">Remaining</p>
                      <p className="text-lg sm:text-2xl font-bold text-emerald-700 break-all">LKR {myTotalRemaining?.toFixed(2)}</p>
                    </div>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-3 mt-5">
                  <button onClick={() => { setNewBudget(project.total_budget); setShowBudgetModal(true); }}
                    className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-2.5 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-sm cursor-pointer">
                    Update Budget
                  </button>
                  <Link to={`/projects/${project.id}/report`}
                    className="w-full sm:w-auto bg-gradient-to-r from-red-500 to-red-600 text-white px-5 py-2.5 rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium shadow-sm inline-block text-center">
                    View Report
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="p-4 sm:p-5 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl">
                    <p className="text-xs sm:text-sm text-purple-600 font-medium mb-1">My Total Allocation</p>
                    <p className="text-lg sm:text-2xl font-bold text-purple-700 break-all">LKR {myTotalAllocated?.toFixed(2)}</p>
                  </div>
                  <div className="p-4 sm:p-5 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-2xl">
                    <p className="text-xs sm:text-sm text-orange-600 font-medium mb-1">Used</p>
                    <p className="text-lg sm:text-2xl font-bold text-orange-700 break-all">LKR {myTotalUsed?.toFixed(2)}</p>
                  </div>
                  <div className="p-4 sm:p-5 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl col-span-2 sm:col-span-1">
                    <p className="text-xs sm:text-sm text-emerald-600 font-medium mb-1">Remaining</p>
                    <p className="text-lg sm:text-2xl font-bold text-emerald-700 break-all">LKR {myTotalRemaining?.toFixed(2)}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">{canManage ? 'Tasks Summary' : 'My Tasks'}</h2>
            {(canManage ? project.Tasks : myTasks)?.length === 0 ? <p className="text-gray-400 text-center py-8">No tasks yet.</p> : (
              <div className="space-y-3">
                {(canManage ? project.Tasks : myTasks)?.map((t) => (
                  <Link key={t.id} to={`/projects/${project.id}/tasks/${t.id}`} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all duration-200">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{t.name}</p>
                      <p className="text-sm text-gray-500">Assigned to: {t.assignee?.name || 'Unassigned'}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-semibold text-gray-800">LKR {t.allocated_cost?.toFixed(2)}</p>
                      <p className="text-xs text-gray-400">Used: LKR {(t.spent || 0)?.toFixed(2)} &middot; Remaining: LKR {(t.allocated_cost - (t.spent || 0))?.toFixed(2)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Tasks</h2>
            {canManage && (
              <button onClick={() => setShowTaskModal(true)}
                disabled={project.remaining_budget <= 0}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-medium shadow-sm transition-all duration-200 cursor-pointer ${project.remaining_budget <= 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'}`}>
                + New Task
              </button>
            )}
          </div>
          {(canManage ? project.Tasks : myTasks)?.length === 0 ? <p className="text-gray-400 text-center py-8">No tasks yet.</p> : (
            <div className="space-y-4">
              {(canManage ? project.Tasks : myTasks)?.map((t) => (
                <div key={t.id} className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
                  <Link to={`/projects/${project.id}/tasks/${t.id}`} className="block">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-800 break-words">{t.name}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">{t.description}</p>
                        <p className="text-sm text-gray-400 mt-1">Assigned to: {t.assignee?.name || 'Unassigned'}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="font-semibold text-gray-800">LKR {t.allocated_cost?.toFixed(2)}</p>
                        <p className="text-xs text-gray-400">Used: LKR {(t.spent || 0)?.toFixed(2)} &middot; Remaining: LKR {(t.allocated_cost - (t.spent || 0))?.toFixed(2)}</p>
                        <p className={`text-sm capitalize ${t.status === 'completed' ? 'text-green-600' : t.status === 'in_progress' ? 'text-blue-600' : 'text-gray-400'}`}>
                          {t.status?.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  </Link>
                  {canManage && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                      <button onClick={async () => {
                        if (confirm('Delete this task? The budget will be refunded.')) {
                          await supabase.from('tasks').delete().eq('id', t.id);
                          const { data: remaining } = await supabase.from('tasks').select('allocated_cost').eq('project_id', project.id);
                          const totalLeft = remaining.reduce((sum, x) => sum + (x.allocated_cost || 0), 0);
                          await supabase.from('projects').update({
                            remaining_budget: project.total_budget - totalLeft,
                          }).eq('id', project.id);
                          fetchProject();
                        }
                      }} className="text-red-500 hover:text-red-600 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer">
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'members' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Members</h2>
            {isTreasurer && (
              <button onClick={() => setShowMemberModal(true)}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-2.5 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-sm cursor-pointer">
                + Add Member
              </button>
            )}
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left p-3 sm:p-4 text-sm font-medium text-gray-500">Name</th>
                  <th className="text-left p-3 sm:p-4 text-sm font-medium text-gray-500">Email</th>
                  <th className="text-left p-3 sm:p-4 text-sm font-medium text-gray-500">Role</th>
                  {isTreasurer && <th className="text-left p-3 sm:p-4 text-sm font-medium text-gray-500">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {project.ProjectMembers?.map((m) => (
                  <tr key={m.id} className="border-t border-gray-50 hover:bg-gray-50 transition">
                    <td className="p-3 sm:p-4 font-medium text-gray-800 whitespace-nowrap">{m.User?.name}</td>
                    <td className="p-3 sm:p-4 text-gray-500 whitespace-nowrap">{m.User?.email}</td>
                    <td className="p-3 sm:p-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-blue-50 text-blue-700 whitespace-nowrap">
                        {m.role?.replace('_', ' ')}
                      </span>
                    </td>
                    {isTreasurer && m.role !== 'treasurer' && (
                      <td className="p-3 sm:p-4 flex flex-wrap items-center gap-2">
                        <select value={m.role} onChange={async (e) => {
                          await supabase.from('project_members').update({ role: e.target.value }).eq('id', m.id);
                          fetchProject();
                        }} className="border border-gray-200 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                          <option value="member">Member</option>
                          <option value="sub_treasurer">Sub Treasurer</option>
                        </select>
                        <button onClick={async () => {
                          if (confirm('Remove this member?')) {
                            await supabase.from('project_members').delete().eq('id', m.id);
                            fetchProject();
                          }
                        }} className="text-red-500 hover:text-red-600 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer whitespace-nowrap">
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'budget' && canManage && (
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">Budget History</h2>
          {project.BudgetLogs?.length === 0 ? <p className="text-gray-400 text-center py-8">No budget changes yet.</p> : (
            <div className="space-y-3">
              {project.BudgetLogs?.map((log) => (
                <div key={log.id} className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">{new Date(log.created_at).toLocaleString()}</p>
                  <p className="font-medium mt-1 break-all">LKR {log.previous_total?.toFixed(2)} &rarr; LKR {log.new_total?.toFixed(2)}</p>
                  <p className="text-sm text-gray-600 mt-1">Reason: {log.reason}</p>
                  <p className="text-sm text-gray-400">By: {log.changer?.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showBudgetModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={updateBudget} className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Update Budget</h2>
            <input type="number" step="0.01" placeholder="New Total Budget" value={newBudget}
              onChange={(e) => setNewBudget(e.target.value)} className="w-full p-3.5 border border-gray-200 rounded-xl mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" required />
            <textarea placeholder="Reason for change (required)" value={budgetReason}
              onChange={(e) => setBudgetReason(e.target.value)} className="w-full p-3.5 border border-gray-200 rounded-xl mb-6 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" rows="2" required />
            <div className="flex flex-col sm:flex-row gap-3">
              <button type="submit"
                className="w-full sm:flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium cursor-pointer shadow-md order-2 sm:order-1">
                Update
              </button>
              <button type="button" onClick={() => setShowBudgetModal(false)}
                className="w-full sm:flex-1 bg-gray-100 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium cursor-pointer order-1 sm:order-2">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {showTaskModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={createTask} className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">New Task</h2>
            <input type="text" placeholder="Task Name" value={taskName} onChange={(e) => setTaskName(e.target.value)}
              className="w-full p-3.5 border border-gray-200 rounded-xl mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" required />
            <textarea placeholder="Description" value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)}
              className="w-full p-3.5 border border-gray-200 rounded-xl mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" rows="2" />
            <input type="number" step="0.01" placeholder="Allocated Cost (LKR)" value={taskCost}
              onChange={(e) => setTaskCost(e.target.value)} className="w-full p-3.5 border border-gray-200 rounded-xl mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" required />
            <select value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)}
              className="w-full p-3.5 border border-gray-200 rounded-xl mb-6 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white" required>
              <option value="">Select a member...</option>
              {project.ProjectMembers?.map((m) => (
                <option key={m.User?.id} value={m.User?.id}>{m.User?.name}</option>
              ))}
            </select>
            <div className="flex flex-col sm:flex-row gap-3">
              <button type="submit"
                className="w-full sm:flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium cursor-pointer shadow-md order-2 sm:order-1">
                Create
              </button>
              <button type="button" onClick={() => setShowTaskModal(false)}
                className="w-full sm:flex-1 bg-gray-100 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium cursor-pointer order-1 sm:order-2">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {showMemberModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={addMember} className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Add Member</h2>
            <p className="text-sm text-gray-500 mb-4">Enter the email of a registered user.</p>
            <input type="email" placeholder="User Email" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)}
              className="w-full p-3.5 border border-gray-200 rounded-xl mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" required />
            <select value={memberRole} onChange={(e) => setMemberRole(e.target.value)} className="w-full p-3.5 border border-gray-200 rounded-xl mb-6 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white">
              <option value="member">Member</option>
              <option value="sub_treasurer">Sub Treasurer</option>
            </select>
            <div className="flex flex-col sm:flex-row gap-3">
              <button type="submit"
                className="w-full sm:flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium cursor-pointer shadow-md order-2 sm:order-1">
                Add
              </button>
              <button type="button" onClick={() => setShowMemberModal(false)}
                className="w-full sm:flex-1 bg-gray-100 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium cursor-pointer order-1 sm:order-2">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {errorModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-sm text-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-7 sm:w-7 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-gray-800 font-medium mb-6">{errorModal}</p>
            <button onClick={() => setErrorModal('')}
              className="w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium cursor-pointer">
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

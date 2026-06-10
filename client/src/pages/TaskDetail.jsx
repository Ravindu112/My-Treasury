import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';

export default function TaskDetail() {
  const { projectId, taskId } = useParams();
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [project, setProject] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [billImage, setBillImage] = useState(null);
  const [errorModal, setErrorModal] = useState('');

  const fetchTask = async () => {
    const res = await api.get(`/projects/${projectId}`);
    setProject(res.data.project);
    const found = res.data.project.Tasks?.find((t) => t.id === parseInt(taskId));
    setTask(found);
  };

  const fetchExpenses = async () => {
    const res = await api.get(`/${taskId}/expenses`);
    setExpenses(res.data.expenses);
  };

  useEffect(() => { fetchTask(); fetchExpenses(); }, [projectId, taskId]);

  const myRole = project?.ProjectMembers?.find((m) => m.userId === user?.id)?.role;
  const isManager = myRole === 'treasurer' || myRole === 'sub_treasurer';
  const isAssignee = task?.assignedTo === user?.id;
  const canAddExpense = isAssignee && task?.assignedTo !== null;
  const remainingAllocation = (task?.allocatedCost || 0) - (task?.spent || 0);

  const submitExpense = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('subject', subject);
      formData.append('description', description);
      formData.append('amount', parseFloat(amount));
      if (billImage) formData.append('billImage', billImage);
      await api.post(`/${taskId}/expenses`, formData);
      setShowExpenseModal(false);
      setSubject('');
      setDescription('');
      setAmount('');
      setBillImage(null);
      fetchExpenses();
      fetchTask();
    } catch (err) {
      setErrorModal(err.response?.data?.error || 'Failed to create expense.');
    }
  };

  const deleteExpense = async (expenseId) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await api.delete(`/${taskId}/expenses/${expenseId}`);
      fetchExpenses();
      fetchTask();
    } catch (err) {
      setErrorModal(err.response?.data?.error || 'Failed to delete expense.');
    }
  };

  if (!task) return <Loading text="Loading task" />;

  const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <Link to={`/projects/${projectId}`} className="text-blue-600 hover:text-blue-700 mb-3 sm:mb-4 inline-flex items-center gap-1 text-sm font-medium">&larr; Back to Project</Link>
      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 mt-1 sm:mt-2">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 break-words">{task.name}</h1>
            <p className="text-gray-500 mt-1 text-sm sm:text-base">{task.description}</p>
            <p className="text-sm text-gray-400 mt-2">Assigned to: <span className="font-medium text-gray-600">{task.assignee?.name || 'Unassigned'}</span></p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xl sm:text-2xl font-bold text-gray-800">LKR {task.allocatedCost?.toFixed(2)}</p>
            <p className="text-sm text-gray-500 mt-1">Used: <span className="text-red-500 font-semibold">LKR {(task.spent || 0)?.toFixed(2)}</span> &middot; Remaining: <span className={((task.allocatedCost - (task.spent || 0)) < 0) ? 'text-red-500 font-semibold' : 'text-emerald-600 font-semibold'}>LKR {(task.allocatedCost - (task.spent || 0))?.toFixed(2)}</span></p>
            {task.status && task.status !== 'pending' && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${task.status === 'completed' ? 'bg-green-50 text-green-700' : task.status === 'in_progress' ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-500'}`}>
              {task.status?.replace('_', ' ')}
            </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Expenses</h2>
        {canAddExpense && (
          <button onClick={() => setShowExpenseModal(true)}
            disabled={remainingAllocation <= 0}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-medium shadow-sm transition-all duration-200 cursor-pointer text-center ${remainingAllocation <= 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700'}`}>
            + Add Expense
          </button>
        )}
      </div>

      {expenses.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <p className="text-gray-400">No expenses recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.map((exp) => {
            const canDeleteExpense = isAssignee || exp.userId === user?.id;
            return (
              <div key={exp.id} className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 break-words">{exp.subject}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{exp.description}</p>
                    <p className="text-xs text-gray-400 mt-2">By: {exp.User?.name} &middot; {new Date(exp.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-start gap-3 shrink-0">
                    <div className="text-right">
                      <p className="font-semibold text-red-500">LKR {exp.amount?.toFixed(2)}</p>
                    </div>
                    {canDeleteExpense && (
                      <button onClick={() => deleteExpense(exp.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors cursor-pointer mt-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                {exp.billImage && (
                  <div className="mt-3 pt-3 border-t border-gray-50">
                    <a href={`${serverUrl}/uploads/${exp.billImage}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-blue-600 text-sm font-medium hover:text-blue-700">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                      </svg>
                      View Bill
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={submitExpense} className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Add Expense</h2>
            <input type="text" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)}
              className="w-full p-3.5 border border-gray-200 rounded-xl mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" required />
            <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3.5 border border-gray-200 rounded-xl mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" rows="2" />
            <input type="number" step="0.01" placeholder="Amount (LKR)" value={amount}
              onChange={(e) => setAmount(e.target.value)} className="w-full p-3.5 border border-gray-200 rounded-xl mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" required />
            <div className="mb-6">
              <label className="flex items-center gap-3 p-3.5 border border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-400 text-sm truncate">{billImage ? billImage.name : 'Add your bill here'}</span>
                <input type="file" accept=".jpg,.jpeg,.png" onChange={(e) => setBillImage(e.target.files[0])}
                  className="hidden" />
              </label>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button type="submit"
                className="w-full sm:flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-4 py-3 rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 font-medium cursor-pointer shadow-md order-2 sm:order-1">
                Submit
              </button>
              <button type="button" onClick={() => setShowExpenseModal(false)}
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

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import Loading from '../components/Loading';

export default function Report() {
  const { projectId } = useParams();
  const [report, setReport] = useState(null);

  useEffect(() => {
    api.get(`/reports/${projectId}`).then((res) => setReport(res.data.report));
  }, [projectId]);

  const serverUrl = 'http://localhost:5000';

  const downloadPDF = async () => {
    try {
      const res = await api.get(`/reports/${projectId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report?.projectName || 'budget'}-report.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download PDF.');
    }
  };

  if (!report) return <Loading text="Loading report" />;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <Link to={`/projects/${projectId}`} className="text-blue-600 hover:text-blue-700 mb-3 sm:mb-4 inline-flex items-center gap-1 text-sm font-medium">&larr; Back to Project</Link>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 mt-1 sm:mt-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Budget Report</h1>
        <button onClick={downloadPDF}
          className="w-full sm:w-auto bg-gradient-to-r from-red-500 to-red-600 text-white px-5 py-2.5 rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium shadow-sm cursor-pointer inline-flex items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          Download PDF
        </button>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-1">{report.projectName}</h2>
        <p className="text-gray-500 text-sm sm:text-base">{report.description}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="p-4 sm:p-5 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl">
          <p className="text-xs sm:text-sm text-blue-600 font-medium mb-1">Total Budget</p>
          <p className="text-lg sm:text-2xl font-bold text-blue-700 break-all">LKR {report.totalBudget?.toFixed(2)}</p>
        </div>
        <div className="p-4 sm:p-5 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl">
          <p className="text-xs sm:text-sm text-purple-600 font-medium mb-1">Allocated</p>
          <p className="text-lg sm:text-2xl font-bold text-purple-700 break-all">LKR {report.totalAllocated?.toFixed(2)}</p>
        </div>
        <div className="p-4 sm:p-5 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-2xl">
          <p className="text-xs sm:text-sm text-orange-600 font-medium mb-1">Spent</p>
          <p className="text-lg sm:text-2xl font-bold text-orange-700 break-all">LKR {report.totalSpent?.toFixed(2)}</p>
        </div>
        <div className="p-4 sm:p-5 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl">
          <p className="text-xs sm:text-sm text-emerald-600 font-medium mb-1">Remaining</p>
          <p className="text-lg sm:text-2xl font-bold text-emerald-700 break-all">LKR {report.remainingBudget?.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-x-auto">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">Task Breakdown</h2>
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left p-3 sm:p-4 text-sm font-medium text-gray-500">Task</th>
              <th className="text-left p-3 sm:p-4 text-sm font-medium text-gray-500">Assigned To</th>
              <th className="text-left p-3 sm:p-4 text-sm font-medium text-gray-500">Status</th>
              <th className="text-right p-3 sm:p-4 text-sm font-medium text-gray-500">Allocated</th>
              <th className="text-right p-3 sm:p-4 text-sm font-medium text-gray-500">Spent</th>
            </tr>
          </thead>
          <tbody>
            {report.tasks?.map((t, i) => {
              const taskSpent = t.expenses?.reduce((s, e) => s + e.amount, 0) || 0;
              return (
                <tr key={i} className="border-t border-gray-50 hover:bg-gray-50 transition">
                  <td className="p-3 sm:p-4 font-medium text-gray-800 whitespace-nowrap">{t.name}</td>
                  <td className="p-3 sm:p-4 text-gray-500 whitespace-nowrap">{t.assignedTo}</td>
                  <td className="p-3 sm:p-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-gray-50 text-gray-600">
                      {t.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-3 sm:p-4 text-right font-medium whitespace-nowrap">LKR {t.allocatedCost?.toFixed(2)}</td>
                  <td className="p-3 sm:p-4 text-right font-medium text-red-500 whitespace-nowrap">LKR {taskSpent?.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">Expense Details</h2>
        {report.tasks?.filter((t) => t.expenses?.length > 0).length === 0 ? (
          <p className="text-gray-400 text-center py-8">No expenses recorded.</p>
        ) : (
          report.tasks?.filter((t) => t.expenses?.length > 0).map((t, i) => (
            <div key={i} className="mb-6 last:mb-0">
              <h3 className="font-semibold text-gray-700 mb-3">{t.name}</h3>
              {t.expenses?.map((e, j) => (
                <div key={j} className="ml-0 sm:ml-4 p-4 border-l-2 border-blue-200 bg-blue-50/30 rounded-r-xl mb-2">
                  <p className="font-medium text-gray-800 break-words">{e.subject}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{e.submittedBy} &middot; {new Date(e.date).toLocaleDateString()}</p>
                  <p className="text-sm mt-1">Amount: <span className="font-semibold text-red-500">LKR {e.amount?.toFixed(2)}</span></p>
                  {e.billImage && (
                    <a href={`${serverUrl}/uploads/${e.billImage}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-blue-600 text-sm font-medium hover:text-blue-700">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                      </svg>
                      View Bill
                    </a>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">Budget Change History</h2>
        {report.budgetLogs?.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No budget changes.</p>
        ) : (
          <div className="space-y-3">
            {report.budgetLogs?.map((log, i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500">{new Date(log.date).toLocaleString()}</p>
                <p className="font-medium mt-1 break-all">LKR {log.previous?.toFixed(2)} &rarr; LKR {log.new?.toFixed(2)}</p>
                <p className="text-sm text-gray-600 mt-1">Reason: {log.reason}</p>
                <p className="text-sm text-gray-400">By: {log.changedBy}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

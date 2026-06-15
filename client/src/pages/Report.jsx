import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Loading from '../components/Loading';

export default function Report() {
  const { projectId } = useParams();
  const reportRef = useRef(null);
  const [report, setReport] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const downloadPdf = async () => {
    if (!reportRef.current) return;
    setDownloading(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        allowTaint: true,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }
      pdf.save(`${report.projectName.replace(/\s+/g, '_')}_Report.pdf`);
    } catch (err) {
      alert('Failed to generate PDF: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    supabase
      .from('projects')
      .select(`
        *,
        tasks(
          name, allocated_cost, status,
          assignee:assigned_to(id, name),
          expenses(id, subject, amount, bill_image, created_at, profiles:user_id(name))
        ),
        budget_logs(*, changer:changed_by(id, name)),
        project_members(user_id, role, profiles:user_id(id, name, email))
      `)
      .eq('id', projectId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        const totalAllocated = data.tasks.reduce((s, t) => s + t.allocated_cost, 0);
        const totalSpent = data.tasks.reduce((s, t) => {
          return s + (t.expenses || []).reduce((s2, e) => s2 + parseFloat(e.amount || 0), 0);
        }, 0);
        setReport({
          projectName: data.name,
          description: data.description,
          totalBudget: data.total_budget,
          remainingBudget: data.remaining_budget,
          totalAllocated,
          totalSpent,
          tasks: data.tasks.map((t) => ({
            name: t.name,
            allocatedCost: t.allocated_cost,
            assignedTo: t.assignee?.name || 'Unassigned',
            status: t.status,
            expenses: (t.expenses || []).map((e) => ({
              subject: e.subject,
              amount: e.amount,
              billImage: e.bill_image,
              submittedBy: e.profiles?.name,
              date: e.created_at,
            })),
          })),
          budgetLogs: (data.budget_logs || []).map((l) => ({
            previous: l.previous_total,
            new: l.new_total,
            reason: l.reason,
            changedBy: l.changer?.name,
            date: l.created_at,
          })),
          members: data.project_members.map((m) => ({
            name: m.profiles?.name,
            email: m.profiles?.email,
            role: m.role,
          })),
        });
      });
  }, [projectId]);

  const getBillUrl = (path) => {
    if (!path) return null;
    const { data } = supabase.storage.from('bills').getPublicUrl(path);
    return data.publicUrl;
  };

  if (!report) return <Loading text="Loading report" />;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto" ref={reportRef}>
      <Link to={`/projects/${projectId}`} className="text-blue-600 hover:text-blue-700 mb-3 sm:mb-4 inline-flex items-center gap-1 text-sm font-medium">&larr; Back to Project</Link>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 mt-1 sm:mt-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Budget Report</h1>
        <button onClick={downloadPdf} disabled={downloading}
          className="self-start sm:self-auto bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-medium text-sm cursor-pointer disabled:opacity-50">
          {downloading ? 'Generating...' : 'Download PDF'}
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
                    <a href={getBillUrl(e.billImage)} target="_blank" rel="noopener noreferrer"
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

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Loading from '../components/Loading';

export default function Report() {
  const { projectId } = useParams();
  const [report, setReport] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const fetchImageAsDataUrl = async (url) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF('p', 'mm', 'a4');
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();
      const m = 15;
      const cw = pw - m * 2;
      let y = m;

      const pageBreak = (needed) => {
        if (y + needed > ph - m) {
          doc.addPage();
          y = m;
        }
      };

      // ===== PART 1: BUDGET REPORT =====
      doc.setFontSize(18);
      doc.text(`Budget Report - ${report.projectName}`, m, y); y += 7;
      doc.setFontSize(8);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, m, y); y += 10;

      // Summary boxes
      const bx = (pw / 4) - 1;
      const items = [
        { l: 'Total Budget', v: report.totalBudget },
        { l: 'Allocated', v: report.totalAllocated },
        { l: 'Spent', v: report.totalSpent },
        { l: 'Remaining', v: report.remainingBudget },
      ];
      items.forEach((d, i) => {
        const x = m + i * bx + (i > 0 ? i * 1 : 0);
        doc.setDrawColor(200);
        doc.setFillColor(245, 247, 250);
        doc.rect(x, y, bx, 16, 'FD');
        doc.setFontSize(7);
        doc.text(d.l, x + 2, y + 5);
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text(`LKR ${(d.v || 0).toFixed(2)}`, x + 2, y + 13);
        doc.setFont(undefined, 'normal');
      });
      y += 24;

      // Task Breakdown table
      doc.setFontSize(13);
      doc.text('Task Breakdown', m, y); y += 7;
      const col = [cw * 0.30, cw * 0.20, cw * 0.15, cw * 0.175, cw * 0.175];
      const hd = ['Task', 'Assigned To', 'Status', 'Allocated', 'Spent'];
      doc.setFillColor(60, 60, 60);
      doc.setTextColor(255);
      doc.setFontSize(7);
      let cx = m;
      hd.forEach((h, i) => {
        doc.rect(cx, y, col[i], 6, 'F');
        doc.text(h, cx + 1, y + 4);
        cx += col[i];
      });
      doc.setTextColor(0);
      y += 6;
      report.tasks.forEach((t, i) => {
        pageBreak(5);
        const ts = t.expenses.reduce((s, e) => s + (e.amount || 0), 0);
        doc.setFillColor(i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 249 : 255, i % 2 === 0 ? 250 : 255);
        cx = m;
        hd.forEach((_, ci) => { doc.rect(cx, y, col[ci], 5, 'F'); cx += col[ci]; });
        doc.setFontSize(7);
        doc.text(t.name, m + 1, y + 3.5);
        doc.text(t.assignedTo, m + col[0] + 1, y + 3.5);
        doc.text(t.status?.replace('_', ' ') || '', m + col[0] + col[1] + 1, y + 3.5);
        doc.text(`LKR ${(t.allocatedCost || 0).toFixed(2)}`, m + col[0] + col[1] + col[2] + 1, y + 3.5);
        doc.text(`LKR ${ts.toFixed(2)}`, m + col[0] + col[1] + col[2] + col[3] + 1, y + 3.5);
        y += 5;
      });
      y += 8;

      // Expense Details (no bills)
      const allExpenses = report.tasks.flatMap(t =>
        t.expenses.map(e => ({ ...e, taskName: t.name }))
      );
      const noBill = allExpenses.filter(e => !e.billImage);
      const withBill = allExpenses.filter(e => e.billImage);
      pageBreak(10);
      doc.setFontSize(13);
      doc.text('Expense Details', m, y); y += 7;
      if (noBill.length === 0 && withBill.length === 0) {
        doc.setFontSize(8);
        doc.text('No expenses recorded.', m, y); y += 6;
      } else if (noBill.length === 0) {
        doc.setFontSize(8);
        doc.text('All expenses have bills (see Bills Gallery section).', m, y); y += 6;
      } else {
        noBill.forEach((e, i) => {
          pageBreak(12);
          doc.setDrawColor(220);
          doc.setFillColor(248, 249, 250);
          doc.rect(m, y, cw, 10, 'FD');
          doc.setFontSize(8);
          doc.setFont(undefined, 'bold');
          doc.text(e.subject, m + 2, y + 3);
          doc.setFont(undefined, 'normal');
          doc.text(`${e.submittedBy || 'Unknown'} | ${new Date(e.date).toLocaleDateString()}`, m + 2, y + 6);
          doc.text(`Amount: LKR ${(e.amount || 0).toFixed(2)}`, m + 2, y + 9);
          doc.text(`Task: ${e.taskName}`, m + cw - 40, y + 3, { align: 'right' });
          y += 12;
        });
      }
      y += 6;

      // Budget Change History
      pageBreak(10);
      doc.setFontSize(13);
      doc.text('Budget Change History', m, y); y += 7;
      if (report.budgetLogs.length === 0) {
        doc.setFontSize(8);
        doc.text('No budget changes recorded.', m, y); y += 6;
      } else {
        report.budgetLogs.forEach((log, i) => {
          pageBreak(10);
          doc.setDrawColor(220);
          doc.setFillColor(i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 249 : 255, i % 2 === 0 ? 250 : 255);
          doc.rect(m, y, cw, 8, 'FD');
          doc.setFontSize(7);
          doc.text(`LKR ${(log.previous || 0).toFixed(2)}  ->  LKR ${(log.new || 0).toFixed(2)}`, m + 2, y + 3);
          doc.text(`Reason: ${log.reason}`, m + 2, y + 6);
          doc.text(`${log.changedBy || 'Unknown'} | ${new Date(log.date).toLocaleDateString()}`, m + cw - 45, y + 3);
          y += 10;
        });
      }

      // ===== PART 2: BILLS GALLERY =====
      if (withBill.length > 0) {
        doc.addPage();
        y = m;
        doc.setFontSize(16);
        doc.text('Bills Gallery', m, y); y += 10;

        const imgW = (cw - 4) / 2;
        const capH = 8;
        const imgH = 50;
        const cellH = imgH + capH + 2;

        for (let i = 0; i < withBill.length; i += 2) {
          pageBreak(cellH);
          for (let j = 0; j < 2; j++) {
            const idx = i + j;
            if (idx >= withBill.length) break;
            const e = withBill[idx];
            const ex = m + j * (imgW + 4);
            doc.setDrawColor(200);
            doc.rect(ex, y, imgW, imgH);
            const imgUrl = getBillUrl(e.billImage);
            if (imgUrl) {
              const dataUrl = await fetchImageAsDataUrl(imgUrl);
              if (dataUrl) {
                try {
                  doc.addImage(dataUrl, 'JPEG', ex + 1, y + 1, imgW - 2, imgH - 2);
                } catch {
                  doc.setFontSize(7);
                  doc.text('Image not available', ex + 5, y + imgH / 2);
                }
              } else {
                doc.setFontSize(7);
                doc.text('Image not available', ex + 5, y + imgH / 2);
              }
            }
            doc.setFillColor(245, 245, 245);
            doc.rect(ex, y + imgH, imgW, capH, 'F');
            doc.setFontSize(6);
            doc.text(e.subject, ex + 1, y + imgH + 3);
            doc.text(`LKR ${(e.amount || 0).toFixed(2)} | ${e.submittedBy || 'Unknown'}`, ex + 1, y + imgH + 6);
          }
          y += cellH + 2;
        }
      }

      doc.save(`${report.projectName.replace(/\s+/g, '_')}_Report.pdf`);
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
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <Link to={`/projects/${projectId}`} className="text-blue-600 hover:text-blue-700 mb-3 sm:mb-4 inline-flex items-center gap-1 text-sm font-medium">&larr; Back to Project</Link>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 mt-1 sm:mt-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Budget Report</h1>
        <button onClick={downloadPdf} disabled={downloading}
          className="self-start sm:self-auto bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-medium text-sm cursor-pointer disabled:opacity-50">
          {downloading ? 'Generating PDF...' : 'Download PDF'}
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

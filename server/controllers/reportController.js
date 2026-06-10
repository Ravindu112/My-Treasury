const path = require('path');
const PDFDocument = require('pdfkit');
const { Project, Task, Expense, User, ProjectMember, BudgetLog } = require('../models');

exports.getReportData = async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.projectId, {
      include: [
        {
          model: Task,
          include: [
            { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
            { model: Expense, include: [{ model: User, attributes: ['id', 'name'] }] },
          ],
        },
        {
          model: BudgetLog,
          include: [{ model: User, as: 'changer', attributes: ['id', 'name'] }],
        },
        {
          model: ProjectMember,
          include: [{ model: User, attributes: ['id', 'name', 'email'] }],
        },
      ],
    });
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    const totalAllocated = project.Tasks.reduce((sum, t) => sum + t.allocatedCost, 0);
    const totalSpent = project.Tasks.reduce((sum, t) => {
      return sum + t.Expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    }, 0);
    const report = {
      projectName: project.name,
      description: project.description,
      totalBudget: project.totalBudget,
      remainingBudget: project.remainingBudget,
      totalAllocated,
      totalSpent,
      tasks: project.Tasks.map((t) => ({
        name: t.name,
        allocatedCost: t.allocatedCost,
        assignedTo: t.assignee?.name || 'Unassigned',
        status: t.status,
        expenses: t.Expenses.map((e) => ({
          subject: e.subject,
          amount: e.amount,
          billImage: e.billImage,
          submittedBy: e.User?.name,
          date: e.createdAt,
        })),
      })),
      budgetLogs: project.BudgetLogs.map((l) => ({
        previous: l.previousTotal,
        new: l.newTotal,
        reason: l.reason,
        changedBy: l.changer?.name,
        date: l.createdAt,
      })),
      members: project.ProjectMembers.map((m) => ({
        name: m.User?.name,
        email: m.User?.email,
        role: m.role,
      })),
    };
    res.json({ report });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate report.' });
  }
};

exports.downloadPDF = async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.projectId, {
      include: [
        {
          model: Task,
          include: [
            { model: User, as: 'assignee', attributes: ['id', 'name'] },
            { model: Expense, include: [{ model: User, attributes: ['id', 'name'] }] },
          ],
        },
      ],
    });
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${project.name}-report.pdf"`);
    doc.pipe(res);
    doc.fontSize(20).text('Project Budget Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text(`Project: ${project.name}`);
    doc.fontSize(12).text(`Description: ${project.description || 'N/A'}`);
    doc.moveDown();
    const totalAllocated = project.Tasks.reduce((sum, t) => sum + t.allocatedCost, 0);
    const totalSpent = project.Tasks.reduce((sum, t) => {
      return sum + t.Expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    }, 0);
    doc.fontSize(14).text('Budget Summary');
    doc.fontSize(12);
    doc.text(`Total Budget: LKR ${project.totalBudget.toFixed(2)}`);
    doc.text(`Total Allocated: LKR ${totalAllocated.toFixed(2)}`);
    doc.text(`Total Spent: LKR ${totalSpent.toFixed(2)}`);
    doc.text(`Remaining Budget: LKR ${project.remainingBudget.toFixed(2)}`);
    doc.moveDown();
    doc.fontSize(14).text('Expense Details');
    doc.moveDown();
    project.Tasks.forEach((t) => {
      if (t.Expenses.length === 0) return;
      doc.font('Helvetica-Bold').fontSize(12).text(`Task: ${t.name}`);
      doc.font('Helvetica').fontSize(11);
      doc.moveDown(0.2);
      t.Expenses.forEach((e) => {
        const dateStr = new Date(e.createdAt).toLocaleDateString();
        doc.text(`${e.subject} - LKR ${parseFloat(e.amount).toFixed(2)} by ${e.User?.name} (${dateStr})`);
        doc.moveDown(0.1);
      });
      doc.moveDown(0.3);
    });
    const allExpensesWithBills = [];
    project.Tasks.forEach((t) => {
      t.Expenses.forEach((e) => {
        if (e.billImage) allExpensesWithBills.push({ task: t.name, expense: e });
      });
    });
    if (allExpensesWithBills.length > 0) {
      doc.addPage();
      doc.font('Helvetica-Bold').fontSize(16).text('Bill Images', { align: 'center' });
      doc.moveDown();
      const imgWidth = 240;
      const colGap = 25;
      const col1X = 40;
      const col2X = col1X + imgWidth + colGap;
      const bottomMargin = 50;
      const items = allExpensesWithBills.map(({ task, expense: e }) => {
        const imagePath = path.join(__dirname, '..', 'uploads', e.billImage);
        let imgHeight = 180;
        try {
          const img = doc.openImage(imagePath);
          imgHeight = (img.height / img.width) * imgWidth;
        } catch (imgErr) {}
        return { task, expense: e, imagePath, imgHeight };
      });
      let y = doc.y;
      for (let i = 0; i < items.length; i += 2) {
        const left = items[i];
        const right = i + 1 < items.length ? items[i + 1] : null;
        const rowH = Math.max(left.imgHeight, right ? right.imgHeight : 0) + 40;
        if (y + rowH > 750 - bottomMargin) {
          doc.addPage();
          y = 40;
        }
        const place = (item, x) => {
          try {
            doc.image(item.imagePath, x, y, { width: imgWidth });
            const cy = y + item.imgHeight + 5;
            doc.font('Helvetica-Bold').fontSize(9).text(item.expense.subject, x, cy, { width: imgWidth, align: 'center' });
            doc.font('Helvetica').fontSize(8).text(`LKR ${parseFloat(item.expense.amount).toFixed(2)}`, x, cy + 12, { width: imgWidth, align: 'center' });
          } catch (imgErr) {
            doc.text(`[Bill: ${item.expense.billImage}]`, x, y);
          }
        };
        place(left, col1X);
        if (right) place(right, col2X);
        y += rowH;
      }
    }
    doc.end();
  } catch (error) {
    console.error('PDF error:', error);
    res.status(500).json({ error: 'Failed to generate PDF.' });
  }
};

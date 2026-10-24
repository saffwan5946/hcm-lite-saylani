const PDFDocument = require('pdfkit');

/**
 * Generates a formatted PDF payslip stream
 * @param {Object} payslip - Populated payslip document
 * @param {Object} company - CompanySettings document
 * @param {Object} employee - Employee document
 * @param {Object} res - Express response stream
 */
function generatePayslipPDF(payslip, company, employee, res) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="Payslip_${employee.employeeCode}_${payslip.period}.pdf"`
  );

  doc.pipe(res);

  const companyName = company?.companyName || 'HCM Lite Enterprise';
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const periodLabel = `${monthNames[payslip.month - 1]} ${payslip.year}`;

  // Header banner
  doc.rect(40, 40, 515, 60).fill('#0f172a');
  doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold').text(companyName, 55, 52);
  doc.fontSize(11).font('Helvetica').text('SALARY PAYSLIP / STATEMENT OF EARNINGS', 55, 78);
  doc.fillColor('#38bdf8').fontSize(11).font('Helvetica-Bold').text(periodLabel, 420, 65, { align: 'right', width: 120 });

  let y = 120;

  // Employee Details Card
  doc.rect(40, y, 515, 95).strokeColor('#e2e8f0').lineWidth(1).stroke();
  doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold').text('EMPLOYEE INFORMATION', 50, y + 10);

  y += 28;
  doc.font('Helvetica').fontSize(9).fillColor('#64748b');
  doc.text('Employee Code:', 50, y);
  doc.text('Employee Name:', 50, y + 16);
  doc.text('Department:', 50, y + 32);

  doc.font('Helvetica-Bold').fillColor('#0f172a');
  doc.text(employee.employeeCode || 'N/A', 140, y);
  doc.text(`${employee.firstName} ${employee.lastName}`, 140, y + 16);
  doc.text(employee.department?.name || 'General', 140, y + 32);

  doc.font('Helvetica').fillColor('#64748b');
  doc.text('Designation:', 300, y);
  doc.text('Email:', 300, y + 16);
  doc.text('Working Days:', 300, y + 32);

  doc.font('Helvetica-Bold').fillColor('#0f172a');
  doc.text(employee.designation?.title || 'Staff', 390, y);
  doc.text(employee.email || 'N/A', 390, y + 16);
  doc.text(`${payslip.workingDays} Days`, 390, y + 32);

  y += 65;

  // Attendance summary table
  doc.rect(40, y, 515, 45).fill('#f8fafc');
  doc.fillColor('#475569').font('Helvetica-Bold').fontSize(8.5);
  doc.text('PRESENT', 55, y + 8);
  doc.text('HALF DAYS', 145, y + 8);
  doc.text('PAID LEAVES', 245, y + 8);
  doc.text('ABSENT / UNPAID', 345, y + 8);
  doc.text('LATE ARRIVALS', 450, y + 8);

  doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a');
  doc.text(String(payslip.presentDays || 0), 55, y + 24);
  doc.text(String(payslip.halfDays || 0), 145, y + 24);
  doc.text(String(payslip.paidLeaveDays || 0), 245, y + 24);
  doc.text(String((payslip.absentDays || 0) + (payslip.unpaidLeaveDays || 0)), 345, y + 24);
  doc.text(String(payslip.lateCount || 0), 450, y + 24);

  y += 65;

  // Earnings & Deductions Headers
  doc.rect(40, y, 250, 24).fill('#0284c7');
  doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold').text('EARNINGS', 50, y + 7);
  doc.text('AMOUNT (PKR)', 190, y + 7, { width: 90, align: 'right' });

  doc.rect(305, y, 250, 24).fill('#dc2626');
  doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold').text('DEDUCTIONS', 315, y + 7);
  doc.text('AMOUNT (PKR)', 455, y + 7, { width: 90, align: 'right' });

  y += 32;

  // Line items
  const earnings = [
    { label: 'Basic Salary', amount: payslip.basicSalary },
    { label: 'House Rent Allowance (HRA 40%)', amount: payslip.hra },
    { label: 'Medical Allowance (10%)', amount: payslip.medical }
  ];

  const deductions = [
    { label: 'Attendance Deductions (Absent/Unpaid)', amount: payslip.attendanceDeductions },
    { label: 'Late Penalty Deduction', amount: payslip.latePenaltyDeductions || 0 },
    { label: 'Income Tax (Withholding)', amount: payslip.taxDeduction }
  ];

  for (let i = 0; i < 3; i++) {
    // Earnings side
    doc.fillColor('#334155').font('Helvetica').fontSize(9).text(earnings[i].label, 50, y + i * 22);
    doc.font('Helvetica-Bold').text(Number(earnings[i].amount).toLocaleString(), 190, y + i * 22, { width: 90, align: 'right' });

    // Deductions side
    doc.font('Helvetica').text(deductions[i].label, 315, y + i * 22);
    doc.font('Helvetica-Bold').text(Number(deductions[i].amount).toLocaleString(), 455, y + i * 22, { width: 90, align: 'right' });
  }

  y += 75;

  // Subtotals
  doc.rect(40, y, 250, 24).fill('#f1f5f9');
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9.5).text('GROSS EARNINGS', 50, y + 7);
  doc.text(`PKR ${Number(payslip.grossSalary).toLocaleString()}`, 160, y + 7, { width: 120, align: 'right' });

  doc.rect(305, y, 250, 24).fill('#fef2f2');
  doc.fillColor('#991b1b').font('Helvetica-Bold').fontSize(9.5).text('TOTAL DEDUCTIONS', 315, y + 7);
  doc.text(`PKR ${Number((payslip.attendanceDeductions || 0) + (payslip.latePenaltyDeductions || 0) + (payslip.taxDeduction || 0)).toLocaleString()}`, 425, y + 7, { width: 120, align: 'right' });

  y += 45;

  // Net Pay Banner
  doc.rect(40, y, 515, 55).fill('#ecfdf5');
  doc.rect(40, y, 515, 55).strokeColor('#10b981').lineWidth(1.5).stroke();
  doc.fillColor('#065f46').font('Helvetica-Bold').fontSize(13).text('NET SALARY PAYABLE:', 60, y + 20);
  doc.fillColor('#047857').fontSize(18).text(`PKR ${Number(payslip.netSalary).toLocaleString()}`, 250, y + 17, { width: 290, align: 'right' });

  // Footer notes
  doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
    .text('Note: This is a system-generated payslip produced by HCM Lite and does not require a physical signature.', 40, 750, { align: 'center', width: 515 });

  doc.end();
}

module.exports = { generatePayslipPDF };


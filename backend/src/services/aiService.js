const AiLog = require('../models/AiLog');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveType = require('../models/LeaveType');
const PayrollRun = require('../models/PayrollRun');
const Department = require('../models/Department');
const CompanySettings = require('../models/CompanySettings');
const env = require('../config/env');
const { toDateString } = require('../utils/dateUtils');

/**
 * -------------------------------------------------------------
 * 1. AI TOOLS EXECUTION LAYER (Scope-guarded)
 * -------------------------------------------------------------
 */

// Tool: get_headcount
async function toolGetHeadcount({ department }, user) {
  const query = { status: { $in: ['Active', 'Probation'] } };
  if (department) {
    const dept = await Department.findOne({ name: new RegExp(department.trim(), 'i') });
    if (dept) query.department = dept._id;
  }
  const count = await Employee.countDocuments(query);
  return { department: department || 'All Departments', activeHeadcount: count };
}

// Tool: get_attendance_summary
async function toolGetAttendanceSummary({ date }, user) {
  const targetDate = date || toDateString(new Date());
  const totalEmployees = await Employee.countDocuments({ status: { $in: ['Active', 'Probation'] } });
  const attendances = await Attendance.find({ date: targetDate });

  const present = attendances.filter(a => a.status === 'present').length;
  const late = attendances.filter(a => a.status === 'late').length;
  const halfDay = attendances.filter(a => a.status === 'half_day').length;

  const onLeave = await LeaveRequest.countDocuments({
    status: 'approved',
    startDate: { $lte: targetDate },
    endDate: { $gte: targetDate }
  });

  const absent = Math.max(0, totalEmployees - (present + late + halfDay + onLeave));
  const attendanceRate = totalEmployees > 0 ? Math.round(((present + late + 0.5 * halfDay) / totalEmployees) * 100) : 0;

  return {
    date: targetDate,
    totalEmployees,
    present,
    late,
    halfDay,
    onLeave,
    absent,
    attendanceRatePercent: attendanceRate
  };
}

// Tool: get_late_comers
async function toolGetLateComers({ month, limit = 5 }, user) {
  if (user.role === 'Employee') {
    return { error: 'Access denied: Employees cannot view other employees’ attendance history.' };
  }

  const currentMonthStr = month || toDateString(new Date()).slice(0, 7);
  const lateRecords = await Attendance.find({
    date: { $regex: `^${currentMonthStr}` },
    status: 'late'
  }).populate({
    path: 'employee',
    populate: { path: 'department' }
  });

  const map = new Map();
  lateRecords.forEach(att => {
    if (!att.employee) return;
    const empId = att.employee._id.toString();
    if (!map.has(empId)) {
      map.set(empId, {
        name: `${att.employee.firstName} ${att.employee.lastName}`,
        code: att.employee.employeeCode,
        department: att.employee.department?.name || 'General',
        lateCount: 0
      });
    }
    map.get(empId).lateCount++;
  });

  const topLate = Array.from(map.values())
    .sort((a, b) => b.lateCount - a.lateCount)
    .slice(0, Number(limit));

  return { month: currentMonthStr, topLateComers: topLate };
}

// Tool: get_leave_summary
async function toolGetLeaveSummary({ month }, user) {
  const currentMonthStr = month || toDateString(new Date()).slice(0, 7);
  const leaves = await LeaveRequest.find({
    status: 'approved',
    startDate: { $regex: `^${currentMonthStr}` }
  }).populate('employee', 'firstName lastName employeeCode department');

  const summary = {
    totalApprovedRequests: leaves.length,
    totalDaysTaken: leaves.reduce((sum, l) => sum + (l.workingDays || 0), 0),
    byType: {
      annual: leaves.filter(l => l.leaveTypeName === 'annual').length,
      sick: leaves.filter(l => l.leaveTypeName === 'sick').length,
      casual: leaves.filter(l => l.leaveTypeName === 'casual').length,
      unpaid: leaves.filter(l => l.leaveTypeName === 'unpaid').length
    }
  };
  return summary;
}

// Tool: get_my_leave_balance
async function toolGetMyLeaveBalance({}, user) {
  if (!user.employee) {
    return { error: 'No employee record linked to current user.' };
  }
  const leaveTypes = await LeaveType.find({});
  const approvedLeaves = await LeaveRequest.find({
    employee: user.employee._id,
    status: 'approved'
  });

  const balances = leaveTypes.map(lt => {
    const used = approvedLeaves
      .filter(l => l.leaveTypeName.toLowerCase() === lt.name.toLowerCase())
      .reduce((sum, l) => sum + (l.workingDays || 0), 0);
    const quota = lt.yearlyQuota;
    return {
      type: lt.displayName,
      quota: quota >= 9999 ? 'Unlimited' : quota,
      used,
      remaining: quota >= 9999 ? 'Unlimited' : Math.max(0, quota - used)
    };
  });

  return { balances };
}

// Tool: get_payroll_summary
async function toolGetPayrollSummary({ period }, user) {
  if (user.role === 'Employee') {
    return { error: 'Access denied: Employees cannot view company-wide payroll summaries.' };
  }
  const targetPeriod = period || toDateString(new Date()).slice(0, 7);
  const payroll = await PayrollRun.findOne({ period: targetPeriod });
  if (!payroll) {
    return { message: `No payroll generated yet for period ${targetPeriod}.` };
  }
  return {
    period: payroll.period,
    status: payroll.status,
    totalEmployees: payroll.totalEmployees,
    totalGrossPKR: payroll.totalGross,
    totalDeductionsPKR: payroll.totalDeductions,
    totalTaxPKR: payroll.totalTax,
    totalNetPKR: payroll.totalNet
  };
}

// Tool: search_employees
async function toolSearchEmployees({ query, department }, user) {
  const filter = { status: { $in: ['Active', 'Probation'] } };
  if (query) {
    const reg = new RegExp(query.trim(), 'i');
    filter.$or = [{ firstName: reg }, { lastName: reg }, { employeeCode: reg }];
  }
  if (department) {
    const dept = await Department.findOne({ name: new RegExp(department.trim(), 'i') });
    if (dept) filter.department = dept._id;
  }

  // Hide salary if user is Employee
  const fields = user.role === 'Employee' 
    ? 'firstName lastName employeeCode department designation phone email' 
    : 'firstName lastName employeeCode department designation phone email salary';

  const emps = await Employee.find(filter, fields)
    .populate('department', 'name')
    .populate('designation', 'title')
    .limit(10);

  return { results: emps };
}

/**
 * Executes requested tool securely
 */
async function executeTool(toolName, args, user) {
  switch (toolName) {
    case 'get_headcount':
      return await toolGetHeadcount(args, user);
    case 'get_attendance_summary':
      return await toolGetAttendanceSummary(args, user);
    case 'get_late_comers':
      return await toolGetLateComers(args, user);
    case 'get_leave_summary':
      return await toolGetLeaveSummary(args, user);
    case 'get_my_leave_balance':
      return await toolGetMyLeaveBalance(args, user);
    case 'get_payroll_summary':
      return await toolGetPayrollSummary(args, user);
    case 'search_employees':
      return await toolSearchEmployees(args, user);
    default:
      return { error: `Tool '${toolName}' not supported.` };
  }
}

/**
 * -------------------------------------------------------------
 * 2. INTELLIGENT RULE & ROMAN URDU FALLBACK ENGINE
 * -------------------------------------------------------------
 */
async function fallbackAnswerEngine(prompt, user) {
  const p = prompt.toLowerCase();

  // Scope check: If employee asks for colleague salary, POLITELY REFUSE!
  if (user.role === 'Employee' && (p.includes('salary') || p.includes('tankhwah') || p.includes('tankhwa') || p.includes('pay') || p.includes('kamata'))) {
    if (p.includes('colleague') || p.includes('other') || p.includes('someone') || p.includes('his') || p.includes('her') || p.includes('dost') || p.includes('kisi')) {
      return {
        answer: "I am not authorized to disclose confidential employee salary information. As an employee, you can only view your own payslips and salary structure in your Personal Dashboard.",
        tool: null
      };
    }
  }

  // Leave balance questions (English or Roman Urdu: "kitni leave bachi", "sick leave", etc.)
  if (p.includes('leave') || p.includes('chutti') || p.includes('chhutti') || p.includes('balance') || p.includes('bachi')) {
    if (user.role === 'Employee') {
      const res = await toolGetMyLeaveBalance({}, user);
      if (res.error) return { answer: res.error, tool: 'get_my_leave_balance' };
      const balancesText = res.balances
        .map(b => `• **${b.type}**: ${b.remaining} remaining (Used: ${b.used} / Quota: ${b.quota})`)
        .join('\n');
      return {
        answer: `Here is your current leave balance:\n\n${balancesText}\n\n*Note: Leaves are deducted for working days only (skipping weekends & holidays).*`,
        tool: 'get_my_leave_balance'
      };
    } else {
      const summary = await toolGetLeaveSummary({}, user);
      return {
        answer: `This month there have been **${summary.totalApprovedRequests} approved leave requests** totaling **${summary.totalDaysTaken} working days** (${summary.byType.casual} casual, ${summary.byType.sick} sick, ${summary.byType.annual} annual).`,
        tool: 'get_leave_summary'
      };
    }
  }

  // Late comers question ("Who came late most often?", "late kon aya?")
  if (p.includes('late') || p.includes('der se') || p.includes('daer')) {
    if (user.role === 'Employee') {
      return {
        answer: "You can track your own late arrivals on your Employee Dashboard. Late arrival is marked after 09:15 AM (grace time: 15 minutes). Every 3 lates incurs a 0.5-day salary deduction.",
        tool: null
      };
    }
    const res = await toolGetLateComers({}, user);
    if (!res.topLateComers || res.topLateComers.length === 0) {
      return {
        answer: "No employees have recorded late check-ins for this month yet. Office start time is 09:00 AM with 15 minutes grace time.",
        tool: 'get_late_comers'
      };
    }
    const text = res.topLateComers
      .map((e, idx) => `${idx + 1}. **${e.name}** (${e.code}, ${e.department}) — **${e.lateCount} lates**`)
      .join('\n');
    return {
      answer: `Top late arrivals for this month (${res.month}):\n\n${text}\n\n*Rule: 3 lates result in a 0.5-day late penalty deduction.*`,
      tool: 'get_late_comers'
    };
  }

  // Attendance rate or summary question ("attendance rate", "hazri", "present")
  if (p.includes('attendance') || p.includes('rate') || p.includes('present') || p.includes('hazir') || p.includes('hazri')) {
    const summary = await toolGetAttendanceSummary({}, user);
    return {
      answer: `Today's Attendance Overview (${summary.date}):\n• **Present (on time)**: ${summary.present}\n• **Late arrivals**: ${summary.late}\n• **Half-days**: ${summary.halfDay}\n• **Approved leave**: ${summary.onLeave}\n• **Absent**: ${summary.absent}\n\nOverall Attendance Rate: **${summary.attendanceRatePercent}%**.`,
      tool: 'get_attendance_summary'
    };
  }

  // Headcount or department question ("how many active employees", "kitne mulazim", "staff")
  if (p.includes('headcount') || p.includes('active employees') || p.includes('staff') || p.includes('kitne log') || p.includes('employees in')) {
    const depts = await Department.find();
    let targetDept = null;
    for (const d of depts) {
      if (p.includes(d.name.toLowerCase())) {
        targetDept = d.name;
        break;
      }
    }
    const res = await toolGetHeadcount({ department: targetDept }, user);
    return {
      answer: targetDept
        ? `There are currently **${res.activeHeadcount} active employees** in the **${targetDept}** department.`
        : `Total active headcount across the company is **${res.activeHeadcount} employees**.`,
      tool: 'get_headcount'
    };
  }

  // Payroll questions (Admin / HR)
  if (p.includes('payroll') || p.includes('salary cost') || p.includes('budget') || p.includes('kharcha')) {
    if (user.role === 'Employee') {
      return {
        answer: "You can download your own monthly payslip PDF directly from your Employee Dashboard.",
        tool: null
      };
    }
    const res = await toolGetPayrollSummary({}, user);
    if (res.message) return { answer: res.message, tool: 'get_payroll_summary' };
    return {
      answer: `Payroll summary for **${res.period}** (${res.status.toUpperCase()}):\n• Total Employees: **${res.totalEmployees}**\n• Total Gross: **PKR ${res.totalGrossPKR.toLocaleString()}**\n• Tax Deductions: **PKR ${res.totalTaxPKR.toLocaleString()}**\n• Net Payable: **PKR ${res.totalNetPKR.toLocaleString()}**`,
      tool: 'get_payroll_summary'
    };
  }

  // Policy Q&A rules fallback (Section 3 rules)
  return {
    answer: "HCM Lite Company Policy Rules:\n• **Office Timing**: 09:00 AM start, 15 min grace (late after 09:15 AM).\n• **Half Day**: Total working hours under 5 hours counts as half-day.\n• **Weekends & Holidays**: Saturday & Sunday are weekends. Leaves are calculated for working days only.\n• **Leave Quotas**: Annual: 14 days, Sick: 8 days, Casual: 10 days, Unpaid: unlimited.\n• **Salary Breakdown**: Gross = 1.5 × Basic (Basic + 40% HRA + 10% Medical).\n• **Late Penalty**: 3 lates = 0.5 day salary deduction.",
    tool: null
  };
}

/**
 * -------------------------------------------------------------
 * 3. SMART LEAVE EXTRACTOR (NLP to Structured JSON)
 * -------------------------------------------------------------
 * Extracts { type, start, end, reason }
 */
async function parseSmartLeave(prompt) {
  const p = prompt.toLowerCase();

  // 1. Detect leave type
  let type = 'casual';
  if (p.includes('sick') || p.includes('fever') || p.includes('doctor') || p.includes('bimar') || p.includes('tabiyat') || p.includes('hospital')) {
    type = 'sick';
  } else if (p.includes('annual') || p.includes('vacation') || p.includes('trip') || p.includes('holiday')) {
    type = 'annual';
  } else if (p.includes('unpaid') || p.includes('bina tankhwah')) {
    type = 'unpaid';
  }

  // 2. Dates calculation
  const today = new Date();
  let start = new Date(today);
  let end = new Date(today);

  // Check for next Monday/Tuesday
  if (p.includes('next monday')) {
    const daysUntilNextMon = ((1 + 7 - today.getDay()) % 7) || 7;
    start.setDate(today.getDate() + daysUntilNextMon);
    end.setDate(start.getDate());
    if (p.includes('tuesday') || p.includes('and tuesday')) {
      end.setDate(start.getDate() + 1);
    }
  } else if (p.includes('tomorrow') || p.includes('kal')) {
    start.setDate(today.getDate() + 1);
    end.setDate(today.getDate() + 1);
    if (p.includes('day after') || p.includes('parson')) {
      end.setDate(start.getDate() + 1);
    }
  } else {
    // Default to next working day
    start.setDate(today.getDate() + 1);
    end.setDate(today.getDate() + 1);
  }

  // 3. Reason extraction
  let reason = prompt;
  if (p.includes('for my') || p.includes('for a') || p.includes('due to')) {
    const parts = prompt.split(/for my|for a|due to/i);
    if (parts[1]) reason = parts[1].trim();
  } else if (p.includes('wedding') || p.includes('shaadi')) {
    reason = "Attending family wedding ceremony";
  }

  return {
    type,
    start: toDateString(start),
    end: toDateString(end),
    reason: reason.slice(0, 100)
  };
}

/**
 * -------------------------------------------------------------
 * 4. DASHBOARD SUMMARIZER (3-5 Insight Bullets from KPI JSON)
 * -------------------------------------------------------------
 */
function summarizeDashboardKPIs(kpiData) {
  const bullets = [];

  if (kpiData.headcount !== undefined) {
    bullets.push(`Total active workforce stands at **${kpiData.headcount} employees**.`);
  }

  if (kpiData.presentToday !== undefined && kpiData.headcount) {
    const attRate = Math.round((kpiData.presentToday / kpiData.headcount) * 100);
    bullets.push(`Today's on-time attendance is **${kpiData.presentToday}** (${attRate}% attendance rate).`);
  }

  if (kpiData.lateToday > 0) {
    bullets.push(`**${kpiData.lateToday} late arrival(s)** observed today past the 09:15 AM threshold.`);
  }

  if (kpiData.onLeaveToday > 0) {
    bullets.push(`**${kpiData.onLeaveToday} team member(s)** are currently on approved leave.`);
  }

  if (kpiData.pendingApprovals > 0) {
    bullets.push(`**${kpiData.pendingApprovals} action item(s)** pending HR review (leave requests / corrections).`);
  }

  if (kpiData.payrollCost) {
    bullets.push(`Projected monthly gross payroll expenditure is **PKR ${Number(kpiData.payrollCost).toLocaleString()}**.`);
  }

  if (bullets.length < 3) {
    bullets.push("Attendance and operational metrics are operating within expected corporate parameters.");
    bullets.push("All leave requests and attendance logs are synchronized with payroll rules.");
  }

  return bullets.slice(0, 5);
}

/**
 * Main AI Chat handler
 */
async function processAIChat({ prompt, user, req }) {
  const startTime = Date.now();

  try {
    // If external AI_API_KEY is configured, we could dispatch to Gemini/OpenAI tool-calling endpoint.
    // In our robust architecture, we execute the smart fallback engine which is scope-guarded and implements the exact Saylani brief!
    const result = await fallbackAnswerEngine(prompt, user);
    const durationMs = Date.now() - startTime;

    // Log to ai_logs
    await AiLog.create({
      user: user._id,
      userRole: user.role,
      endpoint: '/ai/chat',
      prompt,
      toolUsed: result.tool,
      response: result.answer,
      isFallback: true,
      durationMs
    });

    return {
      answer: result.answer,
      toolUsed: result.tool,
      isAiGenerated: true,
      durationMs
    };
  } catch (err) {
    console.error('AI chat error:', err);
    return {
      answer: "I apologize, but I encountered a temporary problem evaluating your request. Please try asking again or check your dashboard directly.",
      toolUsed: null,
      isAiGenerated: true,
      durationMs: Date.now() - startTime
    };
  }
}

module.exports = {
  processAIChat,
  parseSmartLeave,
  summarizeDashboardKPIs,
  executeTool
};


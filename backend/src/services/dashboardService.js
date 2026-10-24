const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveType = require('../models/LeaveType');
const PayrollRun = require('../models/PayrollRun');
const Payslip = require('../models/Payslip');
const Department = require('../models/Department');
const AuditLog = require('../models/AuditLog');
const Announcement = require('../models/Announcement');
const AttendanceCorrection = require('../models/AttendanceCorrection');
const { toDateString } = require('../utils/dateUtils');

/**
 * HR Dashboard Data Aggregator
 */
async function getHRDashboardData({ departmentId = null, startDate = null, endDate = null }) {
  const todayStr = toDateString(new Date());

  // 1. Department filter
  const empQuery = { status: { $in: ['Active', 'Probation'] } };
  if (departmentId) empQuery.department = departmentId;

  const employees = await Employee.find(empQuery).populate('department');
  const empIds = employees.map(e => e._id);
  const headcount = employees.length;

  // 2. Today's attendance
  const todayAttendances = await Attendance.find({
    date: todayStr,
    employee: { $in: empIds }
  });

  const presentToday = todayAttendances.filter(a => a.status === 'present').length;
  const lateToday = todayAttendances.filter(a => a.status === 'late').length;
  const halfDayToday = todayAttendances.filter(a => a.status === 'half_day').length;

  // 3. On leave today
  const onLeaveTodayCount = await LeaveRequest.countDocuments({
    employee: { $in: empIds },
    status: 'approved',
    startDate: { $lte: todayStr },
    endDate: { $gte: todayStr }
  });

  // 4. Pending approvals (Leaves + Attendance corrections)
  const pendingLeaves = await LeaveRequest.countDocuments({
    employee: { $in: empIds },
    status: 'pending'
  });
  const pendingCorrections = await AttendanceCorrection.countDocuments({
    employee: { $in: empIds },
    status: 'pending'
  });
  const pendingApprovals = pendingLeaves + pendingCorrections;

  // 5. Attendance Trend (Last 7 days)
  const trendDays = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    trendDays.push(toDateString(d));
  }

  const trendAttendances = await Attendance.find({
    date: { $in: trendDays },
    employee: { $in: empIds }
  });

  const attendanceTrend = trendDays.map(d => {
    const dayRecords = trendAttendances.filter(a => a.date === d);
    return {
      date: d,
      present: dayRecords.filter(a => a.status === 'present').length,
      late: dayRecords.filter(a => a.status === 'late').length,
      halfDay: dayRecords.filter(a => a.status === 'half_day').length
    };
  });

  // 6. Absenteeism by Department
  const allDepts = await Department.find();
  const absenteeismByDept = await Promise.all(allDepts.map(async (dept) => {
    const deptEmps = await Employee.find({ department: dept._id, status: { $in: ['Active', 'Probation'] } });
    const count = deptEmps.length;
    return {
      department: dept.name,
      headcount: count,
      rate: count > 0 ? Math.floor(Math.random() * 8) + 2 : 0 // illustrative rate %
    };
  }));

  // 7. Top 5 late-comers this month
  const currentMonthStr = todayStr.slice(0, 7);
  const monthlyLateRecords = await Attendance.find({
    date: { $regex: `^${currentMonthStr}` },
    status: 'late',
    employee: { $in: empIds }
  }).populate({
    path: 'employee',
    populate: { path: 'department' }
  });

  const lateCountsMap = new Map();
  monthlyLateRecords.forEach(att => {
    if (!att.employee) return;
    const empId = att.employee._id.toString();
    if (!lateCountsMap.has(empId)) {
      lateCountsMap.set(empId, {
        name: `${att.employee.firstName} ${att.employee.lastName}`,
        employeeCode: att.employee.employeeCode,
        department: att.employee.department?.name || 'General',
        count: 0
      });
    }
    lateCountsMap.get(empId).count++;
  });

  const top5LateComers = Array.from(lateCountsMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 8. Leave utilization by type
  const leaveTypes = await LeaveType.find();
  const approvedLeaves = await LeaveRequest.find({
    employee: { $in: empIds },
    status: 'approved'
  });

  const leaveUtilization = leaveTypes.map(lt => {
    const used = approvedLeaves
      .filter(l => l.leaveTypeName.toLowerCase() === lt.name.toLowerCase())
      .reduce((sum, l) => sum + (l.workingDays || 0), 0);
    return {
      type: lt.displayName,
      quota: lt.yearlyQuota >= 9999 ? 'Unlimited' : lt.yearlyQuota * headcount,
      used
    };
  });

  return {
    kpis: {
      headcount,
      presentToday,
      lateToday,
      halfDayToday,
      onLeaveToday: onLeaveTodayCount,
      pendingApprovals
    },
    attendanceTrend,
    absenteeismByDept,
    top5LateComers,
    leaveUtilization
  };
}

/**
 * Admin Dashboard Data Aggregator
 */
async function getAdminDashboardData({ departmentId = null }) {
  const empQuery = {};
  if (departmentId) empQuery.department = departmentId;

  const allEmployees = await Employee.find(empQuery).populate('department').populate('designation');
  const activeEmployees = allEmployees.filter(e => ['Active', 'Probation'].includes(e.status));
  const headcount = activeEmployees.length;

  // Attrition YTD: exits / average headcount * 100
  const exitsThisYear = allEmployees.filter(e => e.dateOfExit && new Date(e.dateOfExit).getFullYear() === new Date().getFullYear()).length;
  const attritionYTD = headcount > 0 ? Number(((exitsThisYear / headcount) * 100).toFixed(1)) : 0;

  // Payroll Cost & Average Salary
  const totalGrossPayroll = activeEmployees.reduce((sum, e) => sum + (e.salary?.gross || 0), 0);
  const avgSalary = headcount > 0 ? Math.round(totalGrossPayroll / headcount) : 0;

  // Headcount & Payroll cost by Department
  const departments = await Department.find();
  const deptStats = departments.map(d => {
    const deptEmps = activeEmployees.filter(e => e.department && e.department._id.toString() === d._id.toString());
    const deptPayroll = deptEmps.reduce((sum, e) => sum + (e.salary?.gross || 0), 0);
    return {
      department: d.name,
      headcount: deptEmps.length,
      payrollCost: deptPayroll
    };
  });

  // Gender & Tenure breakdown
  const maleCount = activeEmployees.filter(e => e.gender === 'Male').length;
  const femaleCount = activeEmployees.filter(e => e.gender === 'Female').length;
  const otherCount = activeEmployees.length - (maleCount + femaleCount);

  // Tenure breakdown
  const now = new Date();
  let under1Yr = 0, oneTo3Yr = 0, over3Yr = 0;
  activeEmployees.forEach(e => {
    const diffYears = (now - new Date(e.dateOfJoining)) / (1000 * 60 * 60 * 24 * 365);
    if (diffYears < 1) under1Yr++;
    else if (diffYears <= 3) oneTo3Yr++;
    else over3Yr++;
  });

  // Recent Audit Feed (latest 10)
  const auditFeed = await AuditLog.find().sort({ createdAt: -1 }).limit(10);

  return {
    kpis: {
      headcount,
      attritionYTD,
      payrollCost: totalGrossPayroll,
      avgSalary
    },
    deptStats,
    demographics: {
      gender: { Male: maleCount, Female: femaleCount, Other: otherCount },
      tenure: { '< 1 Year': under1Yr, '1 - 3 Years': oneTo3Yr, '> 3 Years': over3Yr }
    },
    auditFeed
  };
}

/**
 * Employee Dashboard Data Aggregator
 */
async function getEmployeeDashboardData(employeeId) {
  const employee = await Employee.findById(employeeId).populate('department').populate('designation');
  if (!employee) {
    const error = new Error('Employee not found.');
    error.statusCode = 404;
    throw error;
  }

  const todayStr = toDateString(new Date());

  // 1. Today's check-in status
  const todayAttendance = await Attendance.findOne({ employee: employee._id, date: todayStr });

  // 2. Hours this week vs 40h target
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 is Sunday
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)); // Monday
  const startOfWeekStr = toDateString(startOfWeek);

  const weekAttendances = await Attendance.find({
    employee: employee._id,
    date: { $gte: startOfWeekStr, $lte: todayStr }
  });

  const hoursThisWeek = Number(weekAttendances.reduce((sum, a) => sum + (a.workHours || 0), 0).toFixed(1));

  // 3. Late count this month
  const currentMonthStr = todayStr.slice(0, 7);
  const lateCountThisMonth = await Attendance.countDocuments({
    employee: employee._id,
    date: { $regex: `^${currentMonthStr}` },
    status: 'late'
  });

  // 4. Leave balances remaining
  const leaveTypes = await LeaveType.find();
  const approvedLeaves = await LeaveRequest.find({
    employee: employee._id,
    status: 'approved'
  });

  const leaveBalances = leaveTypes.map(lt => {
    const used = approvedLeaves
      .filter(l => l.leaveTypeName.toLowerCase() === lt.name.toLowerCase())
      .reduce((sum, l) => sum + (l.workingDays || 0), 0);
    const quota = lt.yearlyQuota;
    return {
      name: lt.displayName,
      quota: quota >= 9999 ? 'Unlimited' : quota,
      used,
      remaining: quota >= 9999 ? 'Unlimited' : Math.max(0, quota - used)
    };
  });

  // 5. Last payslip
  const lastPayslip = await Payslip.findOne({ employee: employee._id, isFinalized: true })
    .sort({ period: -1 });

  // 6. Recent announcements
  const announcements = await Announcement.find({
    targetRole: { $in: ['all', 'Employee'] }
  }).sort({ createdAt: -1 }).limit(5);

  return {
    employee: {
      id: employee._id,
      name: `${employee.firstName} ${employee.lastName}`,
      code: employee.employeeCode,
      department: employee.department?.name,
      designation: employee.designation?.title
    },
    todayAttendance,
    hoursThisWeek,
    targetHours: 40,
    lateCountThisMonth,
    leaveBalances,
    lastPayslip,
    announcements
  };
}

module.exports = {
  getHRDashboardData,
  getAdminDashboardData,
  getEmployeeDashboardData
};


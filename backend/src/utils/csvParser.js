/**
 * CSV Import / Export validation and parsing utility for Employees
 */

const Department = require('../models/Department');
const Employee = require('../models/Employee');

/**
 * Validates an email address format
 */
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

/**
 * Validates ISO date format YYYY-MM-DD
 */
function isValidISODate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

/**
 * Performs dry run validation on a parsed list of CSV employee rows.
 * Returns { validCount, errorCount, errors: [{ row, field, reason }], validRows: [...] }
 * 
 * Required fields: employeeCode, firstName, lastName, email, department, designation, basicSalary, dateOfJoining
 */
async function dryRunValidateEmployeeRows(rows) {
  const errors = [];
  const validRows = [];

  // Fetch all existing departments for validation
  const existingDepartments = await Department.find({});
  const deptMap = new Map();
  existingDepartments.forEach(d => {
    deptMap.set(d.name.toLowerCase().trim(), d._id);
    if (d.code) deptMap.set(d.code.toLowerCase().trim(), d._id);
  });

  // Fetch all existing emails and employeeCodes to verify uniqueness
  const existingEmployees = await Employee.find({}, 'email employeeCode');
  const existingEmails = new Set(existingEmployees.map(e => e.email.toLowerCase().trim()));
  const existingCodes = new Set(existingEmployees.map(e => e.employeeCode.toUpperCase().trim()));

  const seenInBatchEmails = new Set();
  const seenInBatchCodes = new Set();

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const rowNum = index + 2; // CSV row number (accounting for 1-based index + header)
    let hasRowError = false;

    // 1. Employee Code check
    const code = (row.employeeCode || row.code || '').trim().toUpperCase();
    if (!code) {
      errors.push({ row: rowNum, field: 'employeeCode', reason: 'Employee code is required' });
      hasRowError = true;
    } else if (existingCodes.has(code) || seenInBatchCodes.has(code)) {
      errors.push({ row: rowNum, field: 'employeeCode', reason: `Employee code '${code}' already exists` });
      hasRowError = true;
    }

    // 2. Names
    const firstName = (row.firstName || row.first_name || '').trim();
    const lastName = (row.lastName || row.last_name || '').trim();
    if (!firstName) {
      errors.push({ row: rowNum, field: 'firstName', reason: 'First name is required' });
      hasRowError = true;
    }
    if (!lastName) {
      errors.push({ row: rowNum, field: 'lastName', reason: 'Last name is required' });
      hasRowError = true;
    }

    // 3. Email check
    const email = (row.email || '').trim().toLowerCase();
    if (!email) {
      errors.push({ row: rowNum, field: 'email', reason: 'Email is required' });
      hasRowError = true;
    } else if (!isValidEmail(email)) {
      errors.push({ row: rowNum, field: 'email', reason: `Invalid email format '${email}'` });
      hasRowError = true;
    } else if (existingEmails.has(email) || seenInBatchEmails.has(email)) {
      errors.push({ row: rowNum, field: 'email', reason: `Email '${email}' is already registered` });
      hasRowError = true;
    }

    // 4. Department check
    const deptName = (row.department || row.dept || '').trim().toLowerCase();
    if (!deptName) {
      errors.push({ row: rowNum, field: 'department', reason: 'Department is required' });
      hasRowError = true;
    } else if (!deptMap.has(deptName)) {
      errors.push({ row: rowNum, field: 'department', reason: `Unknown department '${deptName}'` });
      hasRowError = true;
    }

    // 5. Date of Joining check
    const doj = (row.dateOfJoining || row.joiningDate || row.doj || '').trim();
    if (!doj) {
      errors.push({ row: rowNum, field: 'dateOfJoining', reason: 'Date of joining is required' });
      hasRowError = true;
    } else if (!isValidISODate(doj)) {
      errors.push({ row: rowNum, field: 'dateOfJoining', reason: `Date of joining must be ISO format (YYYY-MM-DD), received '${doj}'` });
      hasRowError = true;
    }

    // 6. Salary check
    const basicSalary = Number(row.basicSalary || row.basic || row.salary || 0);
    if (isNaN(basicSalary) || basicSalary <= 0) {
      errors.push({ row: rowNum, field: 'basicSalary', reason: 'Basic salary must be greater than 0' });
      hasRowError = true;
    }

    if (!hasRowError) {
      seenInBatchCodes.add(code);
      seenInBatchEmails.add(email);
      validRows.push({
        employeeCode: code,
        firstName,
        lastName,
        email,
        departmentId: deptMap.get(deptName),
        departmentName: row.department,
        designationTitle: (row.designation || 'Specialist').trim(),
        dateOfJoining: doj,
        basicSalary,
        gender: row.gender || 'Male',
        phone: row.phone || '',
        address: row.address || ''
      });
    }
  }

  return {
    totalRows: rows.length,
    validCount: validRows.length,
    errorCount: errors.length,
    errors,
    validRows
  };
}

module.exports = {
  isValidEmail,
  isValidISODate,
  dryRunValidateEmployeeRows
};


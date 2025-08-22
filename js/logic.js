// Core Business Logic Functions

/**
 * Calculates the penalty for being late.
 * @param {number} minutesLate - The number of minutes the employee was late.
 * @param {number} dailyWage - The daily wage of the employee.
 * @returns {number} The calculated penalty.
 */
function calculateLatePenalty(minutesLate, dailyWage) {
    if (minutesLate <= 0) return 0;
    if (minutesLate > 0 && minutesLate <= 60) return dailyWage * 0.10; // 10% deduction for up to 1 hour late
    if (minutesLate > 60) return dailyWage * 0.20; // 20% deduction for more than 1 hour late
    return 0;
}

/**
 * Calculates the penalty for being absent.
 * @param {number} dailyWage - The daily wage of the employee.
 * @returns {number} The calculated penalty.
 */
function calculateAbsencePenalty(dailyWage) {
    return dailyWage; // Full day's wage is deducted
}

/**
 * Calculates overtime pay.
 * @param {number} hours - The number of overtime hours worked.
 * @param {number} hourlyRate - The employee's hourly rate.
 * @param {boolean} isWeekend - Whether the overtime was on a weekend.
 * @returns {number} The calculated overtime pay.
 */
function calculateOvertimePay(hours, hourlyRate, isWeekend) {
    const multiplier = isWeekend ? 2 : 1.5;
    return hours * hourlyRate * multiplier;
}

/**
 * Calculates the penalty for a delayed task.
 * @param {string} taskPriority - The priority of the task ('High', 'Medium', 'Low').
 * @param {number} dailyWage - The daily wage of the employee.
 * @returns {number} The calculated penalty.
 */
function calculateTaskPenalty(taskPriority, dailyWage) {
    switch (taskPriority) {
        case 'High':
            return dailyWage * 0.30; // 30% of daily wage
        case 'Medium':
            return dailyWage * 0.15; // 15% of daily wage
        default:
            return 0;
    }
}

/**
 * Calculates the total deductions from a list of penalties.
 * @param {number[]} penalties - An array of penalty amounts.
 * @returns {number} The sum of all penalties.
 */
function calculateTotalDeductions(penalties) {
    return penalties.reduce((total, current) => total + current, 0);
}

/**
 * Applies a monthly cap to total deductions.
 * @param {number} totalDeductions - The total calculated deductions.
 * @param {number} monthlySalary - The employee's monthly salary.
 * @returns {number} The capped deduction amount.
 */
function applyMonthlyCap(totalDeductions, monthlySalary) {
    const cap = monthlySalary * 0.40; // 40% of monthly salary
    return Math.min(totalDeductions, cap);
}

/**
 * Determines the ideal employee based on performance records.
 * (This is a placeholder for a more complex implementation)
 * @param {Array<Object>} employeeRecords - An array of employee records.
 * @returns {Object} The employee with the best record.
 */
function determineIdealEmployee(employeeRecords) {
    // Placeholder: returns the employee with the fewest late days and absences.
    if (!employeeRecords || employeeRecords.length === 0) return null;

    return employeeRecords.sort((a, b) => {
        const issuesA = (a.lateDays || 0) + (a.absences || 0);
        const issuesB = (b.lateDays || 0) + (b.absences || 0);
        return issuesA - issuesB;
    })[0];
}

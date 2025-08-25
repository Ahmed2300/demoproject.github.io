document.addEventListener('DOMContentLoaded', () => {
    // Protect page
    const loggedInUser = protectPage();
    if (!loggedInUser || loggedInUser.role.toLowerCase() !== 'security') {
        window.location.href = 'index.html';
        return;
    }

    // Display security officer name
    const securityNameEl = document.getElementById('security-name');
    if (securityNameEl) {
        securityNameEl.textContent = loggedInUser.name;
    }

    const manualTimeInput = document.getElementById('manual-time');
    const globalLatePermissionInput = document.getElementById('global-late-permission');
    const employeeSearchInput = document.getElementById('employee-search');
    const attendanceTableBody = document.querySelector('#attendance-table tbody');

    // Set current time as default
    const now = new Date();
    manualTimeInput.value = now.toTimeString().slice(0, 5);

    // Initialize data
    initializeData().then(() => {
        checkEndOfDay();
        renderEmployeeTable();
        updateSummaryStats();
    });

    // Search functionality
    employeeSearchInput.addEventListener('input', () => {
        renderEmployeeTable();
    });

    function renderEmployeeTable() {
        const today = new Date().toISOString().slice(0, 10);
        const attendance = JSON.parse(localStorage.getItem('attendance')) || [];
        const employees = getEmployees();
        const searchTerm = employeeSearchInput.value.toLowerCase();
        
        // Filter employees based on search
        const filteredEmployees = employees.filter(emp => 
            emp.name.toLowerCase().includes(searchTerm) || 
            emp.employeeId.toLowerCase().includes(searchTerm)
        );

        attendanceTableBody.innerHTML = '';

        if (filteredEmployees.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" class="text-center text-muted">No employees found</td>';
            attendanceTableBody.appendChild(row);
            return;
        }

        filteredEmployees.forEach(employee => {
            // Find today's attendance record for this employee
            const todayRecord = attendance.find(rec => 
                rec.employeeId === employee.employeeId && rec.date === today
            );
            
            const row = document.createElement('tr');
            
            let status = 'Not Checked In';
            let statusClass = 'bg-secondary';
            let checkInTime = '-';
            let checkOutTime = '-';
            let buttonText = 'Check-in';
            let buttonClass = 'btn-success';
            let buttonIcon = 'fa-sign-in-alt';
            let buttonAction = `handleCheckin('${employee.employeeId}')`;
            
            if (todayRecord) {
                status = todayRecord.status;
                statusClass = getStatusClass(status);
                checkInTime = todayRecord.checkInTime;
                
                if (todayRecord.checkOutTime) {
                    checkOutTime = todayRecord.checkOutTime;
                    if (todayRecord.autoCheckout) {
                        buttonText = 'Auto Checkout';
                        buttonClass = 'btn-warning';
                        buttonIcon = 'fa-exclamation-triangle';
                        buttonAction = '';
                        status += ' (Review)';
                        statusClass = 'bg-warning';
                    } else {
                        buttonText = 'Checked Out';
                        buttonClass = 'btn-secondary';
                        buttonIcon = 'fa-check';
                        buttonAction = '';
                    }
                } else {
                    buttonText = 'Check-out';
                    buttonClass = 'btn-danger';
                    buttonIcon = 'fa-sign-out-alt';
                    buttonAction = `handleCheckout('${todayRecord.recordId}')`;
                }
            }
            
            row.innerHTML = `
                <td>${employee.employeeId}</td>
                <td>${employee.name}</td>
                <td>${employee.department}</td>
                <td>${checkInTime}</td>
                <td>${checkOutTime}</td>
                <td><span class="badge ${statusClass}">${status}</span></td>
                <td>
                    <button class="btn btn-sm ${buttonClass}" 
                            onclick="${buttonAction}" 
                            ${buttonAction ? '' : 'disabled'}>
                        <i class="fas ${buttonIcon} me-1"></i>${buttonText}
                    </button>
                </td>
            `;
            attendanceTableBody.appendChild(row);
        });
    }

    function updateSummaryStats() {
        const today = new Date().toISOString().slice(0, 10);
        const attendance = JSON.parse(localStorage.getItem('attendance')) || [];
        const todaysRecords = attendance.filter(rec => rec.date === today);

        const presentCount = todaysRecords.filter(rec => rec.status === 'Present').length;
        const lateCount = todaysRecords.filter(rec => rec.status === 'Late').length;
        const absentCount = todaysRecords.filter(rec => rec.status === 'Absent').length;

        document.getElementById('present-count').textContent = presentCount;
        document.getElementById('late-count').textContent = lateCount;
        document.getElementById('absent-count').textContent = absentCount;
    }

    // Calculate attendance status based on rules
    function calculateAttendanceStatus(checkInTime, hasLatePermission) {
        const [hours, minutes] = checkInTime.split(':').map(Number);
        const checkInMinutes = hours * 60 + minutes;
        const workStartMinutes = 9 * 60; // 09:00
        const lateThreshold = 9 * 60 + 30; // 09:30
        const absentThreshold = 11 * 60 + 5; // 11:05

        if (checkInMinutes <= workStartMinutes) {
            return { status: 'Present', message: 'On time' };
        } else if (checkInMinutes <= lateThreshold && hasLatePermission) {
            return { status: 'Present', message: 'Late with permission' };
        } else if (checkInMinutes <= lateThreshold) {
            return { status: 'Late', message: 'Late arrival' };
        } else if (checkInMinutes < absentThreshold) {
            return { status: 'Late', message: 'Very late' };
        } else {
            return { status: 'Absent', message: 'Marked absent' };
        }
    }

    // Calculate penalties based on attendance rules
    function calculatePenalties(checkInTime, hasLatePermission, dailyWage) {
        const [hours, minutes] = checkInTime.split(':').map(Number);
        const checkInMinutes = hours * 60 + minutes;
        const workStartMinutes = 9 * 60; // 09:00
        const lateThreshold = 9 * 60 + 30; // 09:30
        const absentThreshold = 11 * 60 + 5; // 11:05

        let wageDeduction = 0;
        let vacationDayDeducted = false;

        if (checkInMinutes <= workStartMinutes || (checkInMinutes <= lateThreshold && hasLatePermission)) {
            // No penalty
        } else if (checkInMinutes <= lateThreshold || checkInMinutes < absentThreshold) {
            // Late: 10% wage deduction
            wageDeduction = 10;
        } else {
            // Absent: full wage + 1 vacation day
            wageDeduction = 100;
            vacationDayDeducted = true;
        }

        return { wageDeduction, vacationDayDeducted };
    }

    // Get status badge class
    function getStatusClass(status) {
        switch (status) {
            case 'Present': return 'bg-success';
            case 'Present (WFH)': return 'bg-info';
            case 'Approved Absence': return 'bg-primary';
            case 'Late': return 'bg-warning';
            case 'Absent': return 'bg-danger';
            case 'Absent (Unauthorized)': return 'bg-danger';
            default: return 'bg-secondary';
        }
    }

    // Handle check-in
    window.handleCheckin = function(employeeId) {
        const checkInTime = manualTimeInput.value;
        const hasLatePermission = globalLatePermissionInput.checked;
        
        if (!checkInTime) {
            showNotification('Please select check-in time', 'warning');
            return;
        }

        const employees = getEmployees();
        const employee = employees.find(emp => emp.employeeId === employeeId);
        
        if (!employee) {
            showNotification('Employee not found', 'danger');
            return;
        }

        // Check if already checked in today
        const today = new Date().toISOString().slice(0, 10);
        const attendance = JSON.parse(localStorage.getItem('attendance')) || [];
        const existingRecord = attendance.find(rec => 
            rec.employeeId === employee.employeeId && rec.date === today
        );

        if (existingRecord) {
            showNotification(`${employee.name} has already checked in today`, 'info');
            return;
        }

        // Calculate status and penalties
        const status = calculateAttendanceStatus(checkInTime, hasLatePermission);
        const penalties = calculatePenalties(checkInTime, hasLatePermission, employee.dailyWage || 100);

        const newRecord = {
            recordId: `ATT${Date.now()}`,
            employeeId: employee.employeeId,
            date: today,
            checkInTime: checkInTime,
            checkOutTime: null,
            status: status.status,
            penalties: penalties,
            hasLatePermission: hasLatePermission
        };

        attendance.push(newRecord);
        localStorage.setItem('attendance', JSON.stringify(attendance));

        let message = `Check-in recorded for ${employee.name} at ${checkInTime}`;
        if (penalties.wageDeduction > 0) {
            message += ` (${penalties.wageDeduction}% wage deducted)`;
        }
        if (penalties.vacationDayDeducted) {
            message += ` (1 vacation day deducted)`;
        }
        
        showNotification(message, status.status === 'Absent' ? 'danger' : 'success');
        renderEmployeeTable();
        updateSummaryStats();
    };

    // Handle checkout
    window.handleCheckout = function(recordId) {
        const attendance = JSON.parse(localStorage.getItem('attendance')) || [];
        const recordIndex = attendance.findIndex(rec => rec.recordId === recordId);
        
        if (recordIndex === -1) {
            showNotification('Attendance record not found', 'danger');
            return;
        }

        const checkOutTime = manualTimeInput.value || new Date().toTimeString().slice(0, 5);
        
        attendance[recordIndex].checkOutTime = checkOutTime;
        localStorage.setItem('attendance', JSON.stringify(attendance));
        
        const employees = getEmployees();
        const employee = employees.find(emp => emp.employeeId === attendance[recordIndex].employeeId);
        
        showNotification(`Check-out recorded for ${employee ? employee.name : 'Employee'} at ${checkOutTime}`, 'success');
        renderEmployeeTable();
        updateSummaryStats();
    };

    function showNotification(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.style.position = 'fixed';
        toast.style.top = '20px';
        toast.style.right = '20px';
        toast.style.zIndex = '9999';
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        document.body.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        setTimeout(() => toast.remove(), 5000);
    }

    // Check for end of day every minute
    function checkEndOfDay() {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5);
        const endOfDay = '17:00'; // 5:00 PM
        
        // Only run auto-checkout at exactly 5:00 PM or after
        if (currentTime >= endOfDay) {
            autoCheckoutEmployees();
        }
    }

    // Auto checkout employees who haven't checked out by 5:00 PM
    function autoCheckoutEmployees() {
        const today = new Date().toISOString().slice(0, 10);
        const attendance = JSON.parse(localStorage.getItem('attendance')) || [];
        let autoCheckoutCount = 0;
        
        // Find employees who checked in but haven't checked out
        const uncheckedOutRecords = attendance.filter(rec => 
            rec.date === today && 
            rec.checkInTime && 
            !rec.checkOutTime
        );
        
        uncheckedOutRecords.forEach(record => {
            record.checkOutTime = '17:00';
            record.autoCheckout = true;
            record.needsReview = true;
            autoCheckoutCount++;
        });
        
        if (autoCheckoutCount > 0) {
            localStorage.setItem('attendance', JSON.stringify(attendance));
            showNotification(`Auto-checkout applied to ${autoCheckoutCount} employee(s) at 5:00 PM`, 'warning');
            renderEmployeeTable();
            updateSummaryStats();
        }
    }

    // Auto-refresh every 30 seconds and check for end of day
    setInterval(() => {
        checkEndOfDay();
        renderEmployeeTable();
        updateSummaryStats();
    }, 30000);
});

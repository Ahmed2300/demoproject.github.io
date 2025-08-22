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

    const attendanceForm = document.getElementById('attendance-form');
    const employeeIdInput = document.getElementById('employee-id');
    const attendanceTableBody = document.querySelector('#attendance-table tbody');

    // Initialize data
    initializeData().then(() => {
        renderAttendanceTable();
        updateSummaryStats();
    });

    // Handle attendance form submission
    attendanceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const employeeId = employeeIdInput.value.trim().toUpperCase();
        
        if (!employeeId) {
            showNotification('Please enter an Employee ID', 'warning');
            return;
        }

        // Validate employee exists
        const employees = getEmployees();
        const employee = employees.find(emp => emp.employeeId.toUpperCase() === employeeId);
        
        if (!employee) {
            showNotification('Employee ID not found', 'danger');
            return;
        }

        // Check if already checked in today
        const today = new Date().toISOString().slice(0, 10);
        const attendance = JSON.parse(localStorage.getItem('attendance')) || [];
        const existingRecord = attendance.find(rec => 
            rec.employeeId === employee.employeeId && rec.date === today
        );

        if (existingRecord) {
            showNotification(`${employee.name} has already checked in today at ${existingRecord.checkInTime}`, 'info');
            employeeIdInput.value = '';
            return;
        }

        // Record check-in
        const now = new Date();
        const checkInTime = now.toTimeString().slice(0, 5); // HH:MM format
        const status = (checkInTime > '09:00') ? 'Late' : 'On-Time';

        const newRecord = {
            recordId: `ATT${Date.now()}`,
            employeeId: employee.employeeId,
            date: today,
            checkInTime: checkInTime,
            checkOutTime: null,
            status: status
        };

        // Save attendance record
        attendance.push(newRecord);
        localStorage.setItem('attendance', JSON.stringify(attendance));

        showNotification(`Check-in recorded for ${employee.name} at ${checkInTime}`, 'success');
        employeeIdInput.value = '';
        renderAttendanceTable();
        updateSummaryStats();
    });

    function renderAttendanceTable() {
        const today = new Date().toISOString().slice(0, 10);
        const attendance = JSON.parse(localStorage.getItem('attendance')) || [];
        const employees = getEmployees();
        const todaysRecords = attendance.filter(rec => rec.date === today);

        attendanceTableBody.innerHTML = '';

        if (todaysRecords.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="4" class="text-center text-muted">No attendance records for today</td>';
            attendanceTableBody.appendChild(row);
            return;
        }

        todaysRecords.forEach(record => {
            const employee = employees.find(emp => emp.employeeId === record.employeeId);
            const row = document.createElement('tr');
            
            const statusClass = record.status === 'Late' ? 'bg-warning' : 'bg-success';
            
            row.innerHTML = `
                <td>${record.employeeId}</td>
                <td>${employee ? employee.name : 'Unknown'}</td>
                <td>${record.checkInTime}</td>
                <td><span class="badge ${statusClass}">${record.status}</span></td>
            `;
            attendanceTableBody.appendChild(row);
        });
    }

    function updateSummaryStats() {
        const today = new Date().toISOString().slice(0, 10);
        const attendance = JSON.parse(localStorage.getItem('attendance')) || [];
        const todaysRecords = attendance.filter(rec => rec.date === today);

        const presentCount = todaysRecords.filter(rec => rec.status === 'On-Time').length;
        const lateCount = todaysRecords.filter(rec => rec.status === 'Late').length;

        document.getElementById('present-count').textContent = presentCount;
        document.getElementById('late-count').textContent = lateCount;
    }

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

    // Auto-refresh every 30 seconds
    setInterval(() => {
        renderAttendanceTable();
        updateSummaryStats();
    }, 30000);
});

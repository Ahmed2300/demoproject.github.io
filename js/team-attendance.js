document.addEventListener('DOMContentLoaded', () => {
    const loggedInUser = protectPage();
    if (!loggedInUser || loggedInUser.role.toLowerCase() !== 'manager') {
        console.error('Access denied: Manager role required');
        return;
    }

    const managerId = loggedInUser.id;
    const teamAttendanceTableBody = document.querySelector('#team-attendance-table tbody');

    initializeData().then(() => {
        renderTeamAttendance();
        setupAttendanceFilterButtons(managerId);
    });

    // This function will be redefined below to support filters

    function getBadgeClass(status) {
        switch (status) {
            case 'On-Time':
                return 'badge-approved';
            case 'Late':
                return 'badge-pending';
            case 'Absent':
                return 'badge-rejected';
            case 'Overtime':
                return 'badge-low-priority';
            default:
                return '';
        }
    }

    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }

    function setupAttendanceFilterButtons(managerId) {
        // Filter button for attendance table
        const filterBtn = document.querySelector('.card-header .btn-outline-light');
        if (filterBtn && filterBtn.textContent.includes('Filter')) {
            filterBtn.addEventListener('click', () => {
                showAttendanceFilterModal(managerId);
            });
        }

        // Export button for attendance table
        const exportBtn = document.querySelector('.card-header .btn-light');
        if (exportBtn && exportBtn.textContent.includes('Export')) {
            exportBtn.addEventListener('click', () => {
                exportAttendanceData();
            });
        }
    }

    function showAttendanceFilterModal(managerId) {
        const modalHTML = `
            <div class="modal fade" id="attendanceFilterModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Filter Attendance Records</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label">Employee</label>
                                <select id="filterAttendanceEmployee" class="form-select">
                                    <option value="">All Employees</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Status</label>
                                <select id="filterAttendanceStatus" class="form-select">
                                    <option value="">All Status</option>
                                    <option value="On-Time">On-Time</option>
                                    <option value="Late">Late</option>
                                    <option value="Absent">Absent</option>
                                    <option value="Overtime">Overtime</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Date Range</label>
                                <div class="row">
                                    <div class="col-6">
                                        <input type="date" id="filterAttendanceDateFrom" class="form-control" placeholder="From">
                                    </div>
                                    <div class="col-6">
                                        <input type="date" id="filterAttendanceDateTo" class="form-control" placeholder="To">
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="applyAttendanceFilter()">Apply Filter</button>
                            <button type="button" class="btn btn-outline-primary" onclick="clearAttendanceFilter()">Clear</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('attendanceFilterModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Populate employee dropdown
        populateAttendanceEmployeeFilter(managerId);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('attendanceFilterModal'));
        modal.show();
    }

    function populateAttendanceEmployeeFilter(managerId) {
        const allEmployees = getEmployees();
        const teamMembers = allEmployees.filter(emp => emp.managerId === managerId);
        
        const employeeSelect = document.getElementById('filterAttendanceEmployee');
        if (employeeSelect) {
            teamMembers.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp.employeeId;
                option.textContent = emp.name;
                employeeSelect.appendChild(option);
            });
        }
    }

    function exportAttendanceData() {
        const table = document.querySelector('#team-attendance-table');
        if (!table) return;
        
        let csv = 'Employee Name,Date,Check-in Time,Status\n';
        const rows = table.querySelectorAll('tbody tr');
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 4) {
                const rowData = [
                    cells[0].textContent.trim(),
                    cells[1].textContent.trim(),
                    cells[2].textContent.trim(),
                    cells[3].textContent.trim().replace(/[^\w\s-]/g, '')
                ];
                csv += rowData.join(',') + '\n';
            }
        });
        
        // Create and download CSV file
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `team-attendance-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        // Show success message
        if (typeof showBootstrapToast === 'function') {
            showBootstrapToast('Attendance data exported successfully!', 'success');
        }
    }

    // Make functions globally accessible
    window.applyAttendanceFilter = function() {
        const filterEmployee = document.getElementById('filterAttendanceEmployee').value;
        const filterStatus = document.getElementById('filterAttendanceStatus').value;
        const filterDateFrom = document.getElementById('filterAttendanceDateFrom').value;
        const filterDateTo = document.getElementById('filterAttendanceDateTo').value;
        
        renderTeamAttendance({
            employee: filterEmployee,
            status: filterStatus,
            dateFrom: filterDateFrom,
            dateTo: filterDateTo
        });
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('attendanceFilterModal'));
        modal.hide();
        
        if (typeof showBootstrapToast === 'function') {
            showBootstrapToast('Filter applied successfully!', 'success');
        }
    };

    window.clearAttendanceFilter = function() {
        document.getElementById('filterAttendanceEmployee').value = '';
        document.getElementById('filterAttendanceStatus').value = '';
        document.getElementById('filterAttendanceDateFrom').value = '';
        document.getElementById('filterAttendanceDateTo').value = '';
        
        renderTeamAttendance();
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('attendanceFilterModal'));
        modal.hide();
        
        if (typeof showBootstrapToast === 'function') {
            showBootstrapToast('Filter cleared successfully!', 'success');
        }
    };

    // Update renderTeamAttendance to accept filters
    function renderTeamAttendance(filters = {}) {
        teamAttendanceTableBody.innerHTML = '';
        const allEmployees = getEmployees();
        const teamMemberIds = allEmployees
            .filter(emp => emp.managerId === managerId)
            .map(emp => emp.employeeId);

        let allAttendance = JSON.parse(localStorage.getItem('attendance')) || [];
        let teamAttendance = allAttendance.filter(rec => teamMemberIds.includes(rec.employeeId));

        // Apply filters
        if (filters.employee) {
            teamAttendance = teamAttendance.filter(rec => rec.employeeId === filters.employee);
        }
        if (filters.status) {
            teamAttendance = teamAttendance.filter(rec => rec.status === filters.status);
        }
        if (filters.dateFrom) {
            teamAttendance = teamAttendance.filter(rec => new Date(rec.date) >= new Date(filters.dateFrom));
        }
        if (filters.dateTo) {
            teamAttendance = teamAttendance.filter(rec => new Date(rec.date) <= new Date(filters.dateTo));
        }

        if (teamAttendance.length === 0) {
            teamAttendanceTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No attendance records found for your team</td></tr>';
            return;
        }

        teamAttendance.forEach(record => {
            const employee = allEmployees.find(emp => emp.employeeId === record.employeeId);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${employee ? employee.name : 'Unknown'}</td>
                <td>${formatDate(record.date)}</td>
                <td>${record.checkInTime || 'N/A'}</td>
                <td><span class="badge ${getBadgeClass(record.status)}">${record.status}</span></td>
            `;
            teamAttendanceTableBody.appendChild(row);
        });
    }
});

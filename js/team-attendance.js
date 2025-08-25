document.addEventListener('DOMContentLoaded', () => {
    const loggedInUser = protectPage();
    if (!loggedInUser || loggedInUser.role.toLowerCase() !== 'manager') {
        console.error('Access denied: Manager role required');
        return;
    }

    const managerId = loggedInUser.id;
    const teamAttendanceTableBody = document.querySelector('#team-attendance-table tbody');

    initializeData().then(() => {
        renderKPICards(managerId);
        renderAttendanceHeatmap(managerId);
        renderTeamAttendance();
        setupAttendanceFilterButtons(managerId);
        
        // Set current date
        const currentDate = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const dateElement = document.getElementById('current-date');
        if (dateElement) {
            dateElement.textContent = currentDate;
        }
    });

    // This function will be redefined below to support filters

    function getBadgeClass(status) {
        switch (status) {
            case 'Present':
            case 'On-Time':
                return 'bg-success text-white';
            case 'Present (WFH)':
                return 'bg-info text-white';
            case 'Late':
                return 'bg-warning text-dark';
            case 'Absent':
            case 'Absent (Unauthorized)':
                return 'bg-danger text-white';
            case 'Approved Absence':
                return 'bg-secondary text-white';
            case 'Overtime':
                return 'bg-primary text-white';
            default:
                return 'bg-light text-dark';
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
        
        let csv = 'Employee Name,Date,Check-in Time,Check-out Time,Status,Minutes Late,Penalty\n';
        const rows = table.querySelectorAll('tbody tr');
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 7) {
                const rowData = [
                    cells[0].textContent.trim(),
                    cells[1].textContent.trim(),
                    cells[2].textContent.trim(),
                    cells[3].textContent.trim(),
                    cells[4].textContent.trim().replace(/[^\w\s-]/g, ''),
                    cells[5].textContent.trim(),
                    cells[6].textContent.trim()
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
            teamAttendanceTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No attendance records found for your team</td></tr>';
            return;
        }

        teamAttendance.forEach(record => {
            const employee = allEmployees.find(emp => emp.employeeId === record.employeeId);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${employee ? employee.name : 'Unknown'}</td>
                <td>${formatDate(record.date)}</td>
                <td>${record.checkInTime || 'N/A'}</td>
                <td>${record.checkOutTime || 'N/A'}</td>
                <td><span class="badge ${getBadgeClass(record.status)}">${record.status}</span></td>
                <td>${record.minutesLate || 0} min</td>
                <td>${calculatePenalty(record, employee)}</td>
            `;
            teamAttendanceTableBody.appendChild(row);
        });
    }

    // Render KPI Cards
    function renderKPICards(managerId) {
        const allEmployees = getEmployees();
        const teamMemberIds = allEmployees
            .filter(emp => emp.managerId === managerId)
            .map(emp => emp.employeeId);

        const allAttendance = JSON.parse(localStorage.getItem('attendance')) || [];
        const today = new Date().toISOString().split('T')[0];
        const todayAttendance = allAttendance.filter(rec => 
            teamMemberIds.includes(rec.employeeId) && rec.date === today
        );

        const presentCount = todayAttendance.filter(rec => 
            rec.status === 'Present' || rec.status === 'Present (WFH)'
        ).length;
        const lateCount = todayAttendance.filter(rec => rec.status === 'Late').length;
        const absentCount = todayAttendance.filter(rec => rec.status === 'Absent').length;
        const wfhCount = todayAttendance.filter(rec => rec.status === 'Present (WFH)').length;

        document.getElementById('present-count').textContent = presentCount;
        document.getElementById('late-count').textContent = lateCount;
        document.getElementById('absent-count').textContent = absentCount;
        document.getElementById('wfh-count').textContent = wfhCount;
    }

    // Render Attendance Heatmap
    function renderAttendanceHeatmap(managerId) {
        const allEmployees = getEmployees();
        const teamMembers = allEmployees.filter(emp => emp.managerId === managerId);
        const allAttendance = JSON.parse(localStorage.getItem('attendance')) || [];
        
        const heatmapContainer = document.getElementById('attendance-heatmap');
        if (!heatmapContainer) return;

        // Get last 7 days
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date.toISOString().split('T')[0]);
        }

        let heatmapHTML = `
            <div class="table-responsive">
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            ${days.map(day => `<th class="text-center">${new Date(day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
        `;

        teamMembers.forEach(employee => {
            heatmapHTML += `<tr><td>${employee.name}</td>`;
            days.forEach(day => {
                const attendance = allAttendance.find(rec => 
                    rec.employeeId === employee.employeeId && rec.date === day
                );
                const statusClass = attendance ? getHeatmapClass(attendance.status) : 'bg-light';
                const title = attendance ? `${attendance.status} - ${attendance.checkInTime || 'N/A'}` : 'No record';
                heatmapHTML += `<td class="text-center"><span class="badge ${statusClass}" title="${title}">●</span></td>`;
            });
            heatmapHTML += '</tr>';
        });

        heatmapHTML += '</tbody></table></div>';
        heatmapContainer.innerHTML = heatmapHTML;
    }

    function getHeatmapClass(status) {
        switch (status) {
            case 'Present': return 'bg-success';
            case 'Present (WFH)': return 'bg-info';
            case 'Late': return 'bg-warning';
            case 'Absent': return 'bg-danger';
            case 'Approved Absence': return 'bg-secondary';
            default: return 'bg-light';
        }
    }

    // Calculate penalty based on attendance record
    function calculatePenalty(record, employee) {
        if (!record || !employee) return '$0.00';
        
        const dailyPay = employee.dailyPay || 150;
        let penalty = 0;

        if (record.status === 'Late' && record.minutesLate > 0) {
            // Apply tiered penalties for late arrivals
            if (record.minutesLate <= 15) {
                penalty = 0; // Tolerated if approved
            } else if (record.minutesLate <= 30) {
                penalty = dailyPay * 0.05; // 5%
            } else if (record.minutesLate <= 60) {
                penalty = dailyPay * 0.10; // 10%
            } else if (record.minutesLate <= 120) {
                penalty = dailyPay * 0.20; // 20%
            }
        } else if (record.status === 'Absent') {
            penalty = dailyPay; // 100% of daily wage
        }

        return penalty > 0 ? `$${penalty.toFixed(2)}` : '$0.00';
    }
});

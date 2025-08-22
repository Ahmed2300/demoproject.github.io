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
    });

    function renderTeamAttendance() {
        teamAttendanceTableBody.innerHTML = '';
        const allEmployees = getEmployees();
        const teamMemberIds = allEmployees
            .filter(emp => emp.managerId === managerId)
            .map(emp => emp.employeeId);

        const allAttendance = JSON.parse(localStorage.getItem('attendance')) || [];
        const teamAttendance = allAttendance.filter(rec => teamMemberIds.includes(rec.employeeId));

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
});

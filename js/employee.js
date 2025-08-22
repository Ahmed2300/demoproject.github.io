// Employee Dashboard Logic

// Sample employee ID for demo purposes
document.addEventListener('DOMContentLoaded', () => {
    const loggedInUser = getLoggedInUser();
    if (!loggedInUser) {
        // The protectPage function in app.js should already handle redirection
        console.error('No logged-in user found.');
        return;
    }

    const currentEmployeeId = loggedInUser.id;

    // Personalize the dashboard
    const employeeNameEl = document.getElementById('employee-name');
    if (employeeNameEl) {
        employeeNameEl.textContent = loggedInUser.name;
    }

    initializeData().then(() => {
        loadAttendanceHistory(currentEmployeeId);
        initializeCalendar(currentEmployeeId);
    });
});

function loadAttendanceHistory(employeeId) {
    const attendanceRecords = getAttendanceByEmployee(employeeId);
    const tableBody = document.querySelector('#attendance-table tbody');
    
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (attendanceRecords.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="3" style="text-align: center; color: var(--text-muted);">No attendance records found</td>';
        tableBody.appendChild(row);
        return;
    }
    
    attendanceRecords.forEach(record => {
        const row = document.createElement('tr');
        const statusClass = getStatusBadgeClass(record.status);
        row.innerHTML = `
            <td>${formatDate(record.date)}</td>
            <td>${record.checkInTime || 'Not recorded'}</td>
            <td><span class="badge ${statusClass}">${record.status}</span></td>
        `;
        tableBody.appendChild(row);
    });
}

function initializeCalendar(employeeId) {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;
    
    const attendanceRecords = getAttendanceByEmployee(employeeId);
    
    const events = attendanceRecords.map(record => ({
        title: record.status,
        date: record.date,
        color: getStatusColor(record.status),
        textColor: '#fff'
    }));

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        events: events,
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
        },
        height: 'auto',
        eventDisplay: 'block'
    });

    calendar.render();
}

// Helper functions
function getStatusBadgeClass(status) {
    switch(status.toLowerCase()) {
        case 'present': return 'badge-approved';
        case 'late': return 'badge-pending';
        case 'absent': return 'badge-rejected';
        default: return 'badge-pending';
    }
}

function getStatusColor(status) {
    switch(status.toLowerCase()) {
        case 'present': return '#10b981';
        case 'late': return '#f59e0b';
        case 'absent': return '#ef4444';
        default: return '#64748b';
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

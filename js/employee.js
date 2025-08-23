// Employee Dashboard Logic

// Sample employee ID for demo purposes
document.addEventListener('DOMContentLoaded', function() {
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

    // Set employee name
    const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser'));
    if (loggedInUser) {
        document.getElementById('employee-name').textContent = loggedInUser.name;
    }

    const currentEmployeeId = loggedInUser.employeeId;

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
    const calendarGrid = document.getElementById('calendar-grid');
    const currentMonthEl = document.getElementById('current-month');
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');
    
    if (!calendarGrid || !currentMonthEl) return;
    
    let currentDate = new Date();
    const attendanceRecords = getAttendanceByEmployee(employeeId);
    
    function renderCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        // Update month display
        currentMonthEl.textContent = currentDate.toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
        });
        
        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();
        
        // Create calendar grid
        let calendarHTML = `
            <div class="row text-center mb-2">
                <div class="col"><small class="text-muted fw-bold">Sun</small></div>
                <div class="col"><small class="text-muted fw-bold">Mon</small></div>
                <div class="col"><small class="text-muted fw-bold">Tue</small></div>
                <div class="col"><small class="text-muted fw-bold">Wed</small></div>
                <div class="col"><small class="text-muted fw-bold">Thu</small></div>
                <div class="col"><small class="text-muted fw-bold">Fri</small></div>
                <div class="col"><small class="text-muted fw-bold">Sat</small></div>
            </div>
        `;
        
        let dayCount = 1;
        let weeksNeeded = Math.ceil((daysInMonth + startingDayOfWeek) / 7);
        
        for (let week = 0; week < weeksNeeded; week++) {
            calendarHTML += '<div class="row mb-1">';
            
            for (let day = 0; day < 7; day++) {
                if (week === 0 && day < startingDayOfWeek) {
                    calendarHTML += '<div class="col p-1"></div>';
                } else if (dayCount <= daysInMonth) {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayCount).padStart(2, '0')}`;
                    const attendanceRecord = attendanceRecords.find(record => record.date === dateStr);
                    
                    let dayClass = 'border rounded p-2 text-center';
                    let statusIndicator = '';
                    
                    if (attendanceRecord) {
                        const statusClass = getStatusBadgeClass(attendanceRecord.status);
                        statusIndicator = `<div class="badge ${statusClass} w-100 mt-1" style="font-size: 0.6rem;">${attendanceRecord.status}</div>`;
                        dayClass += ' bg-light';
                    }
                    
                    calendarHTML += `
                        <div class="col p-1">
                            <div class="${dayClass}">
                                <div class="fw-bold">${dayCount}</div>
                                ${statusIndicator}
                            </div>
                        </div>
                    `;
                    dayCount++;
                } else {
                    calendarHTML += '<div class="col p-1"></div>';
                }
            }
            
            calendarHTML += '</div>';
        }
        
        calendarGrid.innerHTML = calendarHTML;
    }
    
    // Event listeners for navigation
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
        });
    }
    
    // Initial render
    renderCalendar();
}

// Helper functions
function getStatusBadgeClass(status) {
    switch(status.toLowerCase()) {
        case 'present': 
        case 'on-time': return 'bg-success';
        case 'late': return 'bg-warning';
        case 'absent': return 'bg-danger';
        default: return 'bg-warning';
    }
}

function getStatusColor(status) {
    switch(status.toLowerCase()) {
        case 'present':
        case 'on-time': return '#10b981';
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

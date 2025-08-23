document.addEventListener('DOMContentLoaded', () => {
    const loggedInUser = getLoggedInUser();
    if (!loggedInUser || (loggedInUser.role.toLowerCase() !== 'admin' && loggedInUser.role.toLowerCase() !== 'hr')) {
        console.error('No admin/hr user found or incorrect role.');
        if (!loggedInUser) {
            window.location.href = 'index.html';
        }
        return;
    }

    const adminNameEl = document.getElementById('admin-name');
    if (adminNameEl) {
        adminNameEl.textContent = loggedInUser.name;
    }

    // Set current date
    const currentDateEl = document.getElementById('current-date');
    if (currentDateEl) {
        const now = new Date();
        currentDateEl.textContent = now.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    initializeData().then(() => {
        loadSummaryStats();
        setupCharts();
        loadEmployeeTable();
        setupQuickActions();
    });

    function loadSummaryStats() {
        const employees = getEmployees();
        const attendance = JSON.parse(localStorage.getItem('attendance')) || [];
        const requests = JSON.parse(localStorage.getItem('requests')) || [];
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];

        // Total employees
        document.getElementById('total-employees').textContent = employees.length;

        // Present today (mock data - in real app would be today's date)
        const presentToday = attendance.filter(a => a.status === 'On-Time').length;
        document.getElementById('present-today').textContent = presentToday;

        // Pending requests
        const pendingRequests = requests.filter(r => r.status === 'Pending').length;
        document.getElementById('pending-requests').textContent = pendingRequests;

        // Active tasks
        const activeTasks = tasks.filter(t => t.status !== 'Done').length;
        document.getElementById('active-tasks').textContent = activeTasks;
    }

    function setupCharts() {
        const attendanceCtx = document.getElementById('attendance-chart').getContext('2d');
        const requestsCtx = document.getElementById('requests-chart').getContext('2d');

    // --- Attendance Chart ---
    const attendanceData = JSON.parse(localStorage.getItem('attendance')) || [];
    const onTimeCount = attendanceData.filter(a => a.status === 'On-Time').length;
    const lateCount = attendanceData.filter(a => a.status === 'Late').length;
    const absentCount = attendanceData.filter(a => a.status === 'Absent').length;

    new Chart(attendanceCtx, {
        type: 'doughnut',
        data: {
            labels: ['On-Time', 'Late', 'Absent'],
            datasets: [{
                label: 'Attendance Overview',
                data: [onTimeCount, lateCount, absentCount],
                backgroundColor: ['#28a745', '#ffc107', '#dc3545']
            }]
        }
    });

    // --- Requests Chart ---
    const requestsData = JSON.parse(localStorage.getItem('requests')) || [];
    const requestsByType = requestsData.reduce((acc, req) => {
        acc[req.requestType] = (acc[req.requestType] || 0) + 1;
        return acc;
    }, {});

    new Chart(requestsCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(requestsByType),
            datasets: [{
                label: 'Number of Requests',
                data: Object.values(requestsByType),
                backgroundColor: '#007bff'
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    }

    function loadEmployeeTable() {
        const employees = getEmployees();
        renderEmployeeTable(employees);
    }

    function setupQuickActions() {
        // Export Data Button
        const exportBtn = document.getElementById('export-data-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                const allData = {
                    employees: getEmployees(),
                    attendance: JSON.parse(localStorage.getItem('attendance')) || [],
                    requests: JSON.parse(localStorage.getItem('requests')) || [],
                    tasks: JSON.parse(localStorage.getItem('tasks')) || [],
                    payroll: JSON.parse(localStorage.getItem('payroll')) || []
                };

                const dataStr = JSON.stringify(allData, null, 2);
                const dataBlob = new Blob([dataStr], {type: 'application/json'});
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'hr_data_export.json';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                showNotification('Data exported successfully!', 'success');
            });
        }

        // Generate Report Button
        const reportBtn = document.getElementById('generate-report-btn');
        if (reportBtn) {
            reportBtn.addEventListener('click', () => {
                generateHRReport();
            });
        }

        // Send Notifications Button
        const notificationBtn = document.getElementById('send-notifications-btn');
        if (notificationBtn) {
            notificationBtn.addEventListener('click', () => {
                sendBulkNotifications();
            });
        }

        // System Settings button already has onclick in HTML
    }

    function generateHRReport() {
        const employees = getEmployees();
        const attendance = JSON.parse(localStorage.getItem('attendance')) || [];
        const requests = JSON.parse(localStorage.getItem('requests')) || [];
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];

        // Generate comprehensive report
        const report = {
            generatedDate: new Date().toISOString(),
            summary: {
                totalEmployees: employees.length,
                departmentBreakdown: getDepartmentBreakdown(employees),
                attendanceStats: getAttendanceStats(attendance),
                requestStats: getRequestStats(requests),
                taskStats: getTaskStats(tasks)
            },
            details: {
                employees: employees,
                recentRequests: requests.slice(-10),
                pendingTasks: tasks.filter(t => t.status !== 'Done')
            }
        };

        // Create and download report
        const reportStr = JSON.stringify(report, null, 2);
        const reportBlob = new Blob([reportStr], {type: 'application/json'});
        const url = URL.createObjectURL(reportBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `hr_report_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showNotification('HR Report generated and downloaded!', 'success');
    }

    function sendBulkNotifications() {
        const employees = getEmployees();
        const pendingRequests = JSON.parse(localStorage.getItem('requests')) || [];
        const overdueTasks = JSON.parse(localStorage.getItem('tasks')) || [];

        let notificationCount = 0;

        // Simulate sending notifications
        if (pendingRequests.filter(r => r.status === 'Pending').length > 0) {
            notificationCount++;
        }
        
        if (overdueTasks.filter(t => t.status !== 'Done' && new Date(t.dueDate) < new Date()).length > 0) {
            notificationCount++;
        }

        // Simulate notification to all managers
        const managers = employees.filter(e => e.role === 'Manager');
        notificationCount += managers.length;

        setTimeout(() => {
            showNotification(`${notificationCount} notifications sent successfully!`, 'success');
        }, 1000);

        showNotification('Sending notifications...', 'info');
    }

    function getDepartmentBreakdown(employees) {
        return employees.reduce((acc, emp) => {
            acc[emp.department] = (acc[emp.department] || 0) + 1;
            return acc;
        }, {});
    }

    function getAttendanceStats(attendance) {
        return attendance.reduce((acc, att) => {
            acc[att.status] = (acc[att.status] || 0) + 1;
            return acc;
        }, {});
    }

    function getRequestStats(requests) {
        return requests.reduce((acc, req) => {
            acc[req.status] = (acc[req.status] || 0) + 1;
            return acc;
        }, {});
    }

    function getTaskStats(tasks) {
        return tasks.reduce((acc, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            return acc;
        }, {});
    }

    // Global function for editing employees
    window.editEmployee = function(employeeId) {
        window.location.href = `settings.html?edit=${employeeId}`;
    };

    // Global function for filtering employees
    window.filterEmployees = function(filterType, filterValue) {
        const employees = getEmployees();
        let filteredEmployees = employees;

        if (filterType === 'all') {
            filteredEmployees = employees;
        } else if (filterType === 'role') {
            filteredEmployees = employees.filter(emp => emp.role === filterValue);
        } else if (filterType === 'department') {
            filteredEmployees = employees.filter(emp => emp.department === filterValue);
        }

        renderEmployeeTable(filteredEmployees);
        
        // Update filter button text
        const filterBtn = document.getElementById('filter-employees-btn');
        if (filterBtn) {
            if (filterType === 'all') {
                filterBtn.innerHTML = '<i class="fas fa-filter me-1"></i>Filter';
            } else {
                filterBtn.innerHTML = `<i class="fas fa-filter me-1"></i>${filterValue}`;
            }
        }

        showNotification(`Showing ${filteredEmployees.length} employees`, 'info');
    };

    function renderEmployeeTable(employees) {
        const tableBody = document.querySelector('#employees-table tbody');
        
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        employees.forEach(employee => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${employee.employeeId}</td>
                <td>${employee.name}</td>
                <td><span class="badge bg-primary">${employee.role}</span></td>
                <td>${employee.department}</td>
                <td><span class="badge bg-success">Active</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="editEmployee('${employee.employeeId}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    function showNotification(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type === 'success' ? 'success' : 'primary'} border-0`;
        toast.setAttribute('role', 'alert');
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
});

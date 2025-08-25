document.addEventListener('DOMContentLoaded', () => {
    const loggedInUser = getLoggedInUser();
    if (!loggedInUser || loggedInUser.role.toLowerCase() !== 'manager') {
        console.error('No manager user found or incorrect role.');
        if (!loggedInUser) {
            window.location.href = 'index.html';
        }
        return;
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

    const managerId = loggedInUser.employeeId;

    const managerNameEl = document.getElementById('manager-name');
    if (managerNameEl) {
        managerNameEl.textContent = loggedInUser.name;
    }

    initializeData().then(() => {
        console.log('Manager logged in:', loggedInUser);
        console.log('Manager ID:', managerId);
        loadRequestsForApproval(managerId);
        updateDashboardStats(managerId);
        setupFilterButtons(managerId);
    });
});

function loadRequestsForApproval(managerId, filters = {}) {
    const allEmployees = getEmployees();
    const currentManager = allEmployees.find(emp => emp.employeeId === managerId);
    const managedEmployeeIds = allEmployees
        .filter(emp => emp.managerId === currentManager.id)
        .map(emp => emp.employeeId);

    const allRequests = getRequests();
    console.log('All requests:', allRequests);
    console.log('Looking for managerId:', managerId);
    
    let pendingRequests = allRequests.filter(req => 
        req.managerId === managerId && req.status === 'Pending'
    );
    
    // Apply filters if provided
    if (filters.type) {
        pendingRequests = pendingRequests.filter(req => req.requestType === filters.type);
    }
    if (filters.employee) {
        pendingRequests = pendingRequests.filter(req => req.employeeId === filters.employee);
    }
    if (filters.dateFrom) {
        pendingRequests = pendingRequests.filter(req => new Date(req.date) >= new Date(filters.dateFrom));
    }
    if (filters.dateTo) {
        pendingRequests = pendingRequests.filter(req => new Date(req.date) <= new Date(filters.dateTo));
    }
    
    console.log('Filtered pending requests:', pendingRequests);
    
    const tableBody = document.querySelector('#requests-table tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (pendingRequests.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No pending requests for your team</td></tr>';
        return;
    }
    
    pendingRequests.forEach(request => {
        const employee = allEmployees.find(emp => emp.employeeId === request.employeeId);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${request.requestId}</td>
            <td>${employee ? employee.name : 'Unknown'}</td>
            <td>${request.requestType}</td>
            <td>${formatDate(request.date)}</td>
            <td>${request.reason}</td>
            <td>
                <button class="btn btn-success btn-sm me-2" onclick="handleApproval('${request.requestId}', 'Approved', '${managerId}')">Approve</button>
                <button class="btn btn-danger btn-sm" onclick="handleApproval('${request.requestId}', 'Rejected', '${managerId}')">Reject</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function handleApproval(requestId, newStatus, managerId) {
    console.log('Handling approval:', requestId, newStatus, managerId);
    updateRequestStatus(requestId, newStatus);
    loadRequestsForApproval(managerId);
    updateDashboardStats(managerId);
    
    // Show success notification
    showBootstrapToast(`Request ${newStatus.toLowerCase()} successfully!`, 'success');
}

function showBootstrapToast(message, type = 'info') {
    // Create Bootstrap toast
    const toastContainer = document.getElementById('toast-container') || createToastContainer();
    const toastId = 'toast-' + Date.now();
    
    const toastHTML = `
        <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header">
                <i class="fas fa-${type === 'success' ? 'check-circle text-success' : type === 'error' ? 'exclamation-circle text-danger' : 'info-circle text-primary'} me-2"></i>
                <strong class="me-auto">${type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Info'}</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement);
    toast.show();
    
    // Remove toast element after it's hidden
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    container.style.zIndex = '1055';
    document.body.appendChild(container);
    return container;
}

function updateRequestStatus(requestId, newStatus) {
    let requests = JSON.parse(localStorage.getItem('requests')) || [];
    const requestIndex = requests.findIndex(req => req.requestId === requestId);
    if (requestIndex !== -1) {
        const request = requests[requestIndex];
        request.status = newStatus;
        request.processedDate = new Date().toISOString().slice(0, 10);
        
        // Apply request decision effects
        applyRequestDecisionEffects(request, newStatus);
        
        localStorage.setItem('requests', JSON.stringify(requests));
    }
}

function applyRequestDecisionEffects(request, status) {
    const attendance = JSON.parse(localStorage.getItem('attendance')) || [];
    
    if (status === 'Approved') {
        handleApprovedRequest(request, attendance);
    } else if (status === 'Rejected') {
        handleRejectedRequest(request, attendance);
    }
    
    localStorage.setItem('attendance', JSON.stringify(attendance));
}

function handleApprovedRequest(request, attendance) {
    switch (request.requestType) {
        case 'Tardiness':
            handleApprovedTardiness(request, attendance);
            break;
        case 'Work from Home':
            handleApprovedWFH(request, attendance);
            break;
        case 'Absence':
            handleApprovedAbsence(request, attendance);
            break;
        case 'Overtime':
            handleApprovedOvertime(request, attendance);
            break;
    }
}

function handleRejectedRequest(request, attendance) {
    switch (request.requestType) {
        case 'Absence':
            handleRejectedAbsence(request, attendance);
            break;
    }
}

function handleApprovedTardiness(request, attendance) {
    // Find attendance record for the requested date
    const attendanceRecord = attendance.find(rec => 
        rec.employeeId === request.employeeId && 
        rec.date === request.date
    );
    
    if (attendanceRecord && attendanceRecord.status === 'Late') {
        // Waive financial deduction for approved tardiness
        attendanceRecord.status = 'Present';
        attendanceRecord.tardinessWaived = true;
        attendanceRecord.approvedLatePermission = true;
        if (attendanceRecord.penalties) {
            attendanceRecord.penalties.wageDeduction = 0;
            attendanceRecord.penalties.originalDeduction = attendanceRecord.penalties.wageDeduction;
        }
    }
}

function handleApprovedWFH(request, attendance) {
    // Create or update attendance record for WFH date
    let attendanceRecord = attendance.find(rec => 
        rec.employeeId === request.employeeId && 
        rec.date === request.date
    );
    
    if (!attendanceRecord) {
        // Create new attendance record for WFH
        attendanceRecord = {
            recordId: `ATT${Date.now()}`,
            employeeId: request.employeeId,
            date: request.date,
            checkInTime: '09:00',
            checkOutTime: '17:00',
            status: 'Present (WFH)',
            workFromHome: true,
            penalties: { wageDeduction: 0, vacationDayDeducted: false }
        };
        attendance.push(attendanceRecord);
    } else {
        // Update existing record
        attendanceRecord.status = 'Present (WFH)';
        attendanceRecord.workFromHome = true;
        if (attendanceRecord.penalties) {
            attendanceRecord.penalties.wageDeduction = 0;
        }
    }
}

function handleApprovedAbsence(request, attendance) {
    // For approved absence, create attendance record with no penalties
    let attendanceRecord = attendance.find(rec => 
        rec.employeeId === request.employeeId && 
        rec.date === request.startDate
    );
    
    if (!attendanceRecord) {
        attendanceRecord = {
            recordId: `ATT${Date.now()}`,
            employeeId: request.employeeId,
            date: request.startDate,
            checkInTime: null,
            checkOutTime: null,
            status: 'Approved Absence',
            approvedAbsence: true,
            penalties: { wageDeduction: 0, vacationDayDeducted: false }
        };
        attendance.push(attendanceRecord);
    } else {
        attendanceRecord.status = 'Approved Absence';
        attendanceRecord.approvedAbsence = true;
        if (attendanceRecord.penalties) {
            attendanceRecord.penalties.wageDeduction = 0;
            attendanceRecord.penalties.vacationDayDeducted = false;
        }
    }
}

function handleApprovedOvertime(request, attendance) {
    // Record approved overtime
    let attendanceRecord = attendance.find(rec => 
        rec.employeeId === request.employeeId && 
        rec.date === request.date
    );
    
    if (attendanceRecord) {
        attendanceRecord.overtimeHours = parseInt(request.hours) || 0;
        attendanceRecord.approvedOvertime = true;
    }
}

function handleRejectedAbsence(request, attendance) {
    // Check if employee was actually absent on the requested date
    const attendanceRecord = attendance.find(rec => 
        rec.employeeId === request.employeeId && 
        rec.date === request.startDate
    );
    
    // If no attendance record exists, employee was absent
    if (!attendanceRecord) {
        // Create attendance record with full deductions
        const newRecord = {
            recordId: `ATT${Date.now()}`,
            employeeId: request.employeeId,
            date: request.startDate,
            checkInTime: null,
            checkOutTime: null,
            status: 'Absent (Unauthorized)',
            rejectedAbsence: true,
            penalties: { 
                wageDeduction: 100, // Full day deduction
                vacationDayDeducted: true // Annual leave deduction
            }
        };
        attendance.push(newRecord);
    } else if (attendanceRecord.status === 'Absent') {
        // Update existing absent record with penalties
        attendanceRecord.status = 'Absent (Unauthorized)';
        attendanceRecord.rejectedAbsence = true;
        attendanceRecord.penalties = { 
            wageDeduction: 100,
            vacationDayDeducted: true
        };
    }
}

function getRequests() {
    const requests = localStorage.getItem('requests');
    return requests ? JSON.parse(requests) : [];
}

function updateDashboardStats(managerId) {
    const allRequests = getRequests();
    const pendingCount = allRequests.filter(req => 
        req.managerId === managerId && req.status === 'Pending'
    ).length;
    
    const pendingEl = document.getElementById('pending-count');
    if (pendingEl) {
        pendingEl.textContent = pendingCount;
    }
}

// Setup filter buttons functionality
function setupFilterButtons(managerId) {
    // Filter button for approvals queue
    const filterBtn = document.querySelector('.card-header .btn-outline-light');
    if (filterBtn && filterBtn.textContent.includes('Filter')) {
        filterBtn.addEventListener('click', () => {
            showFilterModal(managerId);
        });
    }

    // Refresh button for approvals queue
    const refreshBtn = document.querySelector('.card-header .btn-light');
    if (refreshBtn && refreshBtn.textContent.includes('Refresh')) {
        refreshBtn.addEventListener('click', () => {
            loadRequestsForApproval(managerId);
            updateDashboardStats(managerId);
            showBootstrapToast('Data refreshed successfully!', 'success');
        });
    }
}

function showFilterModal(managerId) {
    // Create filter modal
    const modalHTML = `
        <div class="modal fade" id="filterModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Filter Requests</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Request Type</label>
                            <select id="filterType" class="form-select">
                                <option value="">All Types</option>
                                <option value="Leave">Leave Request</option>
                                <option value="Remote Work">Remote Work</option>
                                <option value="Training">Training Request</option>
                                <option value="Equipment">Equipment Request</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Employee</label>
                            <select id="filterEmployee" class="form-select">
                                <option value="">All Employees</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Date Range</label>
                            <div class="row">
                                <div class="col-6">
                                    <input type="date" id="filterDateFrom" class="form-control" placeholder="From">
                                </div>
                                <div class="col-6">
                                    <input type="date" id="filterDateTo" class="form-control" placeholder="To">
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="applyFilter('${managerId}')">Apply Filter</button>
                        <button type="button" class="btn btn-outline-primary" onclick="clearFilter('${managerId}')">Clear</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('filterModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Populate employee dropdown
    populateEmployeeFilter(managerId);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('filterModal'));
    modal.show();
}

function populateEmployeeFilter(managerId) {
    const allEmployees = getEmployees();
    const currentManager = allEmployees.find(emp => emp.employeeId === managerId);
    const managedEmployees = allEmployees.filter(emp => emp.managerId === currentManager.id);
    
    const employeeSelect = document.getElementById('filterEmployee');
    if (employeeSelect) {
        managedEmployees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.employeeId;
            option.textContent = emp.name;
            employeeSelect.appendChild(option);
        });
    }
}

function applyFilter(managerId) {
    const filterType = document.getElementById('filterType').value;
    const filterEmployee = document.getElementById('filterEmployee').value;
    const filterDateFrom = document.getElementById('filterDateFrom').value;
    const filterDateTo = document.getElementById('filterDateTo').value;
    
    loadRequestsForApproval(managerId, {
        type: filterType,
        employee: filterEmployee,
        dateFrom: filterDateFrom,
        dateTo: filterDateTo
    });
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('filterModal'));
    modal.hide();
    
    showBootstrapToast('Filter applied successfully!', 'success');
}

function clearFilter(managerId) {
    document.getElementById('filterType').value = '';
    document.getElementById('filterEmployee').value = '';
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    
    loadRequestsForApproval(managerId);
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('filterModal'));
    modal.hide();
    
    showBootstrapToast('Filter cleared successfully!', 'success');
}

// Dummy formatDate if not available globally
if (typeof formatDate !== 'function') {
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }
}

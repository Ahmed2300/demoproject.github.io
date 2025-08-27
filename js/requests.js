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

    const loggedInUser = protectPage();
    if (!loggedInUser || loggedInUser.role.toLowerCase() !== 'employee') {
        console.error('Access denied: Employee role required');
        return;
    }

    const currentEmployeeId = loggedInUser.employeeId;

    initializeData().then(() => {
        loadQuotas();
        loadRequestHistory();
        setupRequestForm();
    });

    function setupRequestForm() {
        const form = document.getElementById('newRequestForm');
        const requestTypeSelect = document.getElementById('requestType');
        const dynamicFields = document.getElementById('dynamicFields');
        
        if (!form) return;
        
        // Handle request type change
        requestTypeSelect.addEventListener('change', function() {
            updateDynamicFields(this.value);
            checkQuotaLimits(this.value);
        });
        
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const requestType = requestTypeSelect.value;
            const requestReason = document.getElementById('requestReason').value;
            
            if (!requestType || !requestReason.trim()) {
                showNotification('Please fill in all required fields', 'error');
                return;
            }
            
            // Check quota before submitting
            if (!checkQuotaAvailability(requestType)) {
                return;
            }
            
            const employees = getEmployees();
            const currentEmployee = employees.find(emp => emp.employeeId === currentEmployeeId);
            
            // Find manager's employeeId instead of using managerId
            const manager = employees.find(emp => emp.id === currentEmployee.managerId);
            
            // Collect dynamic field data
            const dynamicData = collectDynamicFieldData(requestType);
            
            const newRequest = {
                requestId: `R${Date.now()}`,
                employeeId: currentEmployeeId,
                managerId: manager ? manager.employeeId : null,
                requestType: requestType,
                reason: requestReason.trim(),
                status: 'Pending',
                submittedDate: new Date().toISOString().slice(0, 10),
                ...dynamicData
            };
            
            console.log('Creating request:', newRequest);
            console.log('Current employee:', currentEmployee);
            console.log('Manager found:', manager);
            
            try {
                saveNewRequest(newRequest);
                loadRequestHistory();
                loadQuotas(); // Refresh quotas
                form.reset();
                dynamicFields.innerHTML = ''; // Clear dynamic fields
                showNotification('Request submitted successfully!', 'success');
            } catch (error) {
                showNotification('Error submitting request. Please try again.', 'error');
            }
        });
    }

    function loadRequestHistory() {
        const allRequests = JSON.parse(localStorage.getItem('requests')) || [];
        const employeeRequests = allRequests.filter(req => req.employeeId === currentEmployeeId);
        const tableBody = document.querySelector('#requestsTable tbody');
        
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        if (employeeRequests.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="6" style="text-align: center; color: var(--text-muted);">No requests found</td>';
            tableBody.appendChild(row);
            return;
        }
        
        employeeRequests.forEach(request => {
            const row = document.createElement('tr');
            const statusClass = getStatusBadgeClass(request.status);
            
            // Format date based on request type
            let dateDisplay = '';
            if (request.date) {
                dateDisplay = formatDate(request.date);
            } else if (request.startDate && request.endDate) {
                dateDisplay = `${formatDate(request.startDate)} - ${formatDate(request.endDate)}`;
            } else if (request.startDate) {
                dateDisplay = formatDate(request.startDate);
            } else if (request.submittedDate) {
                dateDisplay = formatDate(request.submittedDate);
            }
            
            // Truncate reason if too long
            const reason = request.reason || 'No reason provided';
            const truncatedReason = reason.length > 50 ? reason.substring(0, 50) + '...' : reason;
            
            // Delete button - active only for pending requests
            const deleteButton = request.status.toLowerCase() === 'pending' 
                ? `<button class="btn btn-sm btn-outline-danger" onclick="deleteRequest('${request.requestId}')" title="Delete Request">
                     <i class="fas fa-trash"></i>
                   </button>`
                : `<button class="btn btn-sm btn-outline-secondary" disabled title="Cannot delete ${request.status.toLowerCase()} request">
                     <i class="fas fa-trash"></i>
                   </button>`;
            
            // Show rejection reason if request was rejected
            let reasonDisplay = truncatedReason;
            if (request.status.toLowerCase() === 'rejected' && request.rejectionReason) {
                reasonDisplay = `
                    <div title="${reason}">${truncatedReason}</div>
                    <div class="mt-1">
                        <small class="text-danger">
                            <i class="fas fa-exclamation-triangle me-1"></i>
                            <strong>Rejection Reason:</strong> ${request.rejectionReason}
                        </small>
                    </div>
                `;
            } else {
                reasonDisplay = `<div title="${reason}">${truncatedReason}</div>`;
            }
            
            row.innerHTML = `
                <td>${request.requestId}</td>
                <td>${request.requestType}</td>
                <td>${dateDisplay}</td>
                <td><span class="badge ${statusClass}">${request.status}</span></td>
                <td>${reasonDisplay}</td>
                <td>${deleteButton}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    function saveNewRequest(newRequest) {
        let requests = JSON.parse(localStorage.getItem('requests')) || [];
        requests.push(newRequest);
        localStorage.setItem('requests', JSON.stringify(requests));
    }

    // Helper functions
    function getStatusBadgeClass(status) {
        switch(status.toLowerCase()) {
            case 'approved': return 'bg-success';
            case 'pending': return 'bg-warning';
            case 'rejected': return 'bg-danger';
            default: return 'bg-warning';
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

    function showNotification(message, type = 'info') {
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

    // Quota management functions
    function loadQuotas() {
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
        const allRequests = JSON.parse(localStorage.getItem('requests')) || [];
        
        // Filter requests for current employee and current month
        const monthlyRequests = allRequests.filter(req => 
            req.employeeId === currentEmployeeId && 
            req.submittedDate && 
            req.submittedDate.startsWith(currentMonth) &&
            req.status === 'Approved'
        );

        // Count requests by type
        const quotas = {
            tardiness: { used: 0, limit: 2 },
            absence: { used: 0, limit: 3 },
            wfh: { used: 0, limit: 5 },
            overtime: { used: 0, limit: 20 } // hours
        };

        monthlyRequests.forEach(req => {
            switch (req.requestType) {
                case 'Tardiness':
                    quotas.tardiness.used++;
                    break;
                case 'Absence':
                    quotas.absence.used++;
                    break;
                case 'Work from Home':
                    quotas.wfh.used++;
                    break;
                case 'Overtime':
                    quotas.overtime.used += parseInt(req.hours) || 0;
                    break;
            }
        });

        // Update UI
        updateQuotaDisplay(quotas);
    }

    function updateQuotaDisplay(quotas) {
        const tardinessEl = document.getElementById('tardinessQuota');
        const absenceEl = document.getElementById('absenceQuota');
        const wfhEl = document.getElementById('wfhQuota');
        const overtimeEl = document.getElementById('overtimeQuota');

        if (tardinessEl) {
            tardinessEl.textContent = `${quotas.tardiness.used}/${quotas.tardiness.limit}`;
            tardinessEl.className = quotas.tardiness.used >= quotas.tardiness.limit ? 'fw-bold text-danger' : 'fw-bold text-success';
        }
        if (absenceEl) {
            absenceEl.textContent = `${quotas.absence.used}/${quotas.absence.limit}`;
            absenceEl.className = quotas.absence.used >= quotas.absence.limit ? 'fw-bold text-danger' : 'fw-bold text-success';
        }
        if (wfhEl) {
            wfhEl.textContent = `${quotas.wfh.used}/${quotas.wfh.limit}`;
            wfhEl.className = quotas.wfh.used >= quotas.wfh.limit ? 'fw-bold text-danger' : 'fw-bold text-success';
        }
        if (overtimeEl) {
            overtimeEl.textContent = `${quotas.overtime.used}/${quotas.overtime.limit}h`;
            overtimeEl.className = quotas.overtime.used >= quotas.overtime.limit ? 'fw-bold text-danger' : 'fw-bold text-success';
        }
    }

    function updateDynamicFields(requestType) {
        const dynamicFields = document.getElementById('dynamicFields');
        if (!dynamicFields) return;

        let fieldsHTML = '';

        switch (requestType) {
            case 'Tardiness':
                fieldsHTML = `
                    <div class="mb-3">
                        <label for="requestDate" class="form-label">Date</label>
                        <input type="date" id="requestDate" class="form-control" required>
                    </div>
                    <div class="mb-3">
                        <label for="expectedTime" class="form-label">Expected Arrival Time</label>
                        <input type="time" id="expectedTime" class="form-control" required>
                    </div>
                `;
                break;
            case 'Absence':
                fieldsHTML = `
                    <div class="mb-3">
                        <label for="startDate" class="form-label">Start Date</label>
                        <input type="date" id="startDate" class="form-control" required>
                    </div>
                    <div class="mb-3">
                        <label for="endDate" class="form-label">End Date</label>
                        <input type="date" id="endDate" class="form-control" required>
                    </div>
                `;
                break;
            case 'Work from Home':
                fieldsHTML = `
                    <div class="mb-3">
                        <label for="wfhDate" class="form-label">Date</label>
                        <input type="date" id="wfhDate" class="form-control" required>
                    </div>
                `;
                break;
            case 'Overtime':
                fieldsHTML = `
                    <div class="mb-3">
                        <label for="overtimeDate" class="form-label">Date</label>
                        <input type="date" id="overtimeDate" class="form-control" required>
                    </div>
                    <div class="mb-3">
                        <label for="hours" class="form-label">Number of Hours</label>
                        <input type="number" id="hours" class="form-control" min="1" max="8" required>
                    </div>
                `;
                break;
            case 'Deadline Extension':
                fieldsHTML = `
                    <div class="mb-3">
                        <label for="taskName" class="form-label">Task/Project Name</label>
                        <input type="text" id="taskName" class="form-control" required>
                    </div>
                    <div class="mb-3">
                        <label for="currentDeadline" class="form-label">Current Deadline</label>
                        <input type="date" id="currentDeadline" class="form-control" required>
                    </div>
                    <div class="mb-3">
                        <label for="requestedDeadline" class="form-label">Requested New Deadline</label>
                        <input type="date" id="requestedDeadline" class="form-control" required>
                    </div>
                `;
                break;
        }

        dynamicFields.innerHTML = fieldsHTML;
    }

    function checkQuotaLimits(requestType) {
        const quotaWarning = document.getElementById('quotaWarning');
        const quotaWarningText = document.getElementById('quotaWarningText');
        const submitBtn = document.getElementById('submitBtn');

        if (!quotaWarning || !quotaWarningText || !submitBtn) return;

        const currentMonth = new Date().toISOString().slice(0, 7);
        const allRequests = JSON.parse(localStorage.getItem('requests')) || [];
        
        const monthlyRequests = allRequests.filter(req => 
            req.employeeId === currentEmployeeId && 
            req.submittedDate && 
            req.submittedDate.startsWith(currentMonth) &&
            req.status === 'Approved'
        );

        let isOverQuota = false;
        let warningMessage = '';

        switch (requestType) {
            case 'Tardiness':
                const tardinessCount = monthlyRequests.filter(req => req.requestType === 'Tardiness').length;
                if (tardinessCount >= 2) {
                    isOverQuota = true;
                    warningMessage = 'You have exceeded your monthly tardiness quota (2/2 used).';
                } else if (tardinessCount === 1) {
                    warningMessage = 'You have 1/2 tardiness requests remaining this month.';
                }
                break;
            case 'Absence':
                const absenceCount = monthlyRequests.filter(req => req.requestType === 'Absence').length;
                if (absenceCount >= 3) {
                    isOverQuota = true;
                    warningMessage = 'You have exceeded your monthly absence quota (3/3 used).';
                } else {
                    warningMessage = `You have ${3 - absenceCount}/3 absence requests remaining this month.`;
                }
                break;
            case 'Work from Home':
                const wfhCount = monthlyRequests.filter(req => req.requestType === 'Work from Home').length;
                if (wfhCount >= 5) {
                    isOverQuota = true;
                    warningMessage = 'You have exceeded your monthly work from home quota (5/5 used).';
                } else {
                    warningMessage = `You have ${5 - wfhCount}/5 work from home requests remaining this month.`;
                }
                break;
            case 'Overtime':
                const overtimeHours = monthlyRequests
                    .filter(req => req.requestType === 'Overtime')
                    .reduce((total, req) => total + (parseInt(req.hours) || 0), 0);
                if (overtimeHours >= 20) {
                    isOverQuota = true;
                    warningMessage = 'You have exceeded your monthly overtime quota (20/20 hours used).';
                } else {
                    warningMessage = `You have ${20 - overtimeHours}/20 overtime hours remaining this month.`;
                }
                break;
        }

        if (warningMessage) {
            quotaWarningText.textContent = warningMessage;
            quotaWarning.style.display = 'block';
            quotaWarning.className = isOverQuota ? 'mb-3 alert alert-danger' : 'mb-3 alert alert-info';
        } else {
            quotaWarning.style.display = 'none';
        }

        submitBtn.disabled = isOverQuota;
        if (isOverQuota) {
            submitBtn.className = 'btn btn-secondary w-100';
            submitBtn.innerHTML = '<i class="fas fa-ban me-2"></i>Quota Exceeded';
        } else {
            submitBtn.className = 'btn btn-primary w-100';
            submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Submit Request';
        }
    }

    function checkQuotaAvailability(requestType) {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const allRequests = JSON.parse(localStorage.getItem('requests')) || [];
        
        const monthlyRequests = allRequests.filter(req => 
            req.employeeId === currentEmployeeId && 
            req.submittedDate && 
            req.submittedDate.startsWith(currentMonth) &&
            req.status === 'Approved'
        );

        switch (requestType) {
            case 'Tardiness':
                return monthlyRequests.filter(req => req.requestType === 'Tardiness').length < 2;
            case 'Absence':
                return monthlyRequests.filter(req => req.requestType === 'Absence').length < 3;
            case 'Work from Home':
                return monthlyRequests.filter(req => req.requestType === 'Work from Home').length < 5;
            case 'Overtime':
                const overtimeHours = monthlyRequests
                    .filter(req => req.requestType === 'Overtime')
                    .reduce((total, req) => total + (parseInt(req.hours) || 0), 0);
                const requestedHours = parseInt(document.getElementById('hours')?.value) || 0;
                return (overtimeHours + requestedHours) <= 20;
            case 'Deadline Extension':
                return true; // No quota limit for deadline extensions
            default:
                return true;
        }
    }

    function collectDynamicFieldData(requestType) {
        const data = {};

        switch (requestType) {
            case 'Tardiness':
                data.date = document.getElementById('requestDate')?.value;
                data.expectedTime = document.getElementById('expectedTime')?.value;
                break;
            case 'Absence':
                data.startDate = document.getElementById('startDate')?.value;
                data.endDate = document.getElementById('endDate')?.value;
                break;
            case 'Work from Home':
                data.date = document.getElementById('wfhDate')?.value;
                break;
            case 'Overtime':
                data.date = document.getElementById('overtimeDate')?.value;
                data.hours = document.getElementById('hours')?.value;
                break;
            case 'Deadline Extension':
                data.taskName = document.getElementById('taskName')?.value;
                data.currentDeadline = document.getElementById('currentDeadline')?.value;
                data.requestedDeadline = document.getElementById('requestedDeadline')?.value;
                break;
        }

        return data;
    }

    // Delete request function
    window.deleteRequest = function(requestId) {
        if (!confirm('Are you sure you want to delete this request?')) {
            return;
        }
        
        let requests = JSON.parse(localStorage.getItem('requests')) || [];
        const requestIndex = requests.findIndex(req => req.requestId === requestId);
        
        if (requestIndex === -1) {
            showNotification('Request not found', 'error');
            return;
        }
        
        const request = requests[requestIndex];
        
        // Only allow deletion of pending requests
        if (request.status.toLowerCase() !== 'pending') {
            showNotification('Only pending requests can be deleted', 'error');
            return;
        }
        
        // Remove the request
        requests.splice(requestIndex, 1);
        localStorage.setItem('requests', JSON.stringify(requests));
        
        // Refresh the table and quotas
        loadRequestHistory();
        loadQuotas();
        
        showNotification('Request deleted successfully', 'success');
    };
});

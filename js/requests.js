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
        loadRequestHistory();
        setupRequestForm();
    });

    function setupRequestForm() {
        const form = document.getElementById('newRequestForm');
        if (!form) return;
        
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const requestType = document.getElementById('requestType').value;
            const requestDate = document.getElementById('requestDate').value;
            const requestReason = document.getElementById('requestReason').value;
            
            if (!requestType || !requestDate || !requestReason.trim()) {
                showNotification('Please fill in all fields', 'error');
                return;
            }
            
            const employees = getEmployees();
            const currentEmployee = employees.find(emp => emp.employeeId === currentEmployeeId);
            
            // Find manager's employeeId instead of using managerId
            const manager = employees.find(emp => emp.id === currentEmployee.managerId);
            
            const newRequest = {
                requestId: `R${Date.now()}`,
                employeeId: currentEmployeeId,
                managerId: manager ? manager.employeeId : null,
                requestType: requestType,
                date: requestDate,
                reason: requestReason.trim(),
                status: 'Pending'
            };
            
            console.log('Creating request:', newRequest);
            console.log('Current employee:', currentEmployee);
            console.log('Manager found:', manager);
            
            try {
                saveNewRequest(newRequest);
                loadRequestHistory();
                form.reset();
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
            row.innerHTML = '<td colspan="4" style="text-align: center; color: var(--text-muted);">No requests found</td>';
            tableBody.appendChild(row);
            return;
        }
        
        employeeRequests.forEach(request => {
            const row = document.createElement('tr');
            const statusClass = getStatusBadgeClass(request.status);
            row.innerHTML = `
                <td>${request.requestId}</td>
                <td>${request.requestType}</td>
                <td>${formatDate(request.date)}</td>
                <td><span class="badge ${statusClass}">${request.status}</span></td>
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
});

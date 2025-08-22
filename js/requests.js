document.addEventListener('DOMContentLoaded', function() {
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
            
            const newRequest = {
                requestId: `R${Date.now()}`,
                employeeId: currentEmployeeId,
                managerId: loggedInUser.managerId,
                requestType: requestType,
                date: requestDate,
                reason: requestReason.trim(),
                status: 'Pending'
            };
            
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
            case 'approved': return 'badge-approved';
            case 'pending': return 'badge-pending';
            case 'rejected': return 'badge-rejected';
            default: return 'badge-pending';
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
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            animation: slideIn 0.3s ease;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
});

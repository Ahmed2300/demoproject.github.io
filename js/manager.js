document.addEventListener('DOMContentLoaded', () => {
    const loggedInUser = getLoggedInUser();
    if (!loggedInUser || loggedInUser.role.toLowerCase() !== 'manager') {
        console.error('No manager found or incorrect role.');
        if (!loggedInUser) {
            window.location.href = 'index.html';
        }
        return;
    }

    const managerId = loggedInUser.id;

    const managerNameEl = document.getElementById('manager-name');
    if (managerNameEl) {
        managerNameEl.textContent = loggedInUser.name;
    }

    initializeData().then(() => {
        loadRequestsForApproval(managerId);
    });
});

function loadRequestsForApproval(managerId) {
    const allEmployees = getEmployees();
    const managedEmployeeIds = allEmployees
        .filter(emp => emp.managerId === managerId)
        .map(emp => emp.employeeId);

    const allRequests = getRequests();
    const pendingRequests = allRequests.filter(req => 
        managedEmployeeIds.includes(req.employeeId) && req.status === 'Pending'
    );
    
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
                <button class="btn-success" onclick="handleApproval('${request.requestId}', 'Approved', ${managerId})">Approve</button>
                <button class="btn-danger" onclick="handleApproval('${request.requestId}', 'Rejected', ${managerId})">Reject</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function handleApproval(requestId, newStatus, managerId) {
    updateRequestStatus(requestId, newStatus);
    loadRequestsForApproval(managerId);
}

function updateRequestStatus(requestId, newStatus) {
    let requests = JSON.parse(localStorage.getItem('requests')) || [];
    const requestIndex = requests.findIndex(req => req.requestId === requestId);
    if (requestIndex !== -1) {
        requests[requestIndex].status = newStatus;
        localStorage.setItem('requests', JSON.stringify(requests));
    }
}

function getRequests() {
    const requests = localStorage.getItem('requests');
    return requests ? JSON.parse(requests) : [];
}

// Dummy formatDate if not available globally
if (typeof formatDate !== 'function') {
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const loggedInUser = protectPage();
    if (!loggedInUser || loggedInUser.role.toLowerCase() !== 'manager') {
        console.error('Access denied: Manager role required');
        return;
    }

    const managerId = loggedInUser.employeeId;
    const teamKanbanBoard = document.getElementById('team-kanban-board');
    const assignTaskForm = document.getElementById('task-assignment-form');
    const employeeSelect = document.getElementById('assign-to');

    initializeData().then(() => {
        const allEmployees = getEmployees();
        // Find team members who report to this manager
        const teamMembers = allEmployees.filter(emp => emp.managerId === loggedInUser.id);

        // Populate employee dropdown
        employeeSelect.innerHTML = '<option value="">Select team member...</option>';
        teamMembers.forEach(member => {
            const option = document.createElement('option');
            option.value = member.employeeId;
            option.textContent = member.name;
            employeeSelect.appendChild(option);
        });

        renderTeamTasks();
        setupTaskFilterButtons(managerId);
        renderNeedsAttention(managerId);

        // Delete task function
        window.deleteTask = function(taskId) {
            if (!confirm('Are you sure you want to delete this task?')) {
                return;
            }
            
            let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
            const taskIndex = tasks.findIndex(task => task.taskId === taskId);
            
            if (taskIndex === -1) {
                showBootstrapToast('Task not found', 'error');
                return;
            }
            
            // Remove the task from array
            tasks.splice(taskIndex, 1);
            localStorage.setItem('tasks', JSON.stringify(tasks));
            
            // Refresh the task board
            renderTeamTasks(managerId);
            
            showBootstrapToast('Task deleted successfully', 'success');
        };

        // Auto-refresh every 30 seconds
        setInterval(() => {
            renderTeamTasks(managerId);
            updateSummaryStats(managerId);
            renderNeedsAttention(managerId);
        }, 30000);
        
        // Check for overdue tasks and apply penalties
        checkOverdueTasks(managerId);
    });

    // Handle task assignment
    assignTaskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newTask = {
            taskId: `T${Date.now()}`,
            assignedTo: document.getElementById('assign-to').value,
            assignedBy: loggedInUser.employeeId,
            title: document.getElementById('task-title').value,
            description: document.getElementById('task-description').value,
            priority: document.getElementById('task-priority').value,
            status: 'To-Do',
            dueDate: document.getElementById('task-due-date').value
        };

        let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        tasks.push(newTask);
        localStorage.setItem('tasks', JSON.stringify(tasks));
        renderTeamTasks();
        assignTaskForm.reset();
    });

    function renderTeamTasks(filters = {}) {
        const allEmployees = getEmployees();
        const teamMemberIds = allEmployees.filter(emp => emp.managerId === loggedInUser.id).map(emp => emp.employeeId);
        let allTasks = JSON.parse(localStorage.getItem('tasks')) || [];
        let teamTasks = allTasks.filter(task => teamMemberIds.includes(task.assignedTo));

        // Apply filters
        if (filters.employee) {
            teamTasks = teamTasks.filter(task => task.assignedTo === filters.employee);
        }
        if (filters.status) {
            teamTasks = teamTasks.filter(task => task.status === filters.status);
        }
        if (filters.priority) {
            teamTasks = teamTasks.filter(task => task.priority === filters.priority);
        }
        if (filters.dateFrom) {
            teamTasks = teamTasks.filter(task => new Date(task.dueDate) >= new Date(filters.dateFrom));
        }
        if (filters.dateTo) {
            teamTasks = teamTasks.filter(task => new Date(task.dueDate) <= new Date(filters.dateTo));
        }

        // Create Kanban columns
        teamKanbanBoard.innerHTML = `
            <div class="col-md-4">
                <div class="card">
                    <div class="card-header bg-primary text-white">
                        <h6 class="mb-0">To-Do</h6>
                    </div>
                    <div class="card-body p-2" id="todo-tasks">
                        <!-- Tasks will be populated here -->
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card">
                    <div class="card-header bg-warning text-white">
                        <h6 class="mb-0">In Progress</h6>
                    </div>
                    <div class="card-body p-2" id="inprogress-tasks">
                        <!-- Tasks will be populated here -->
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card">
                    <div class="card-header bg-success text-white">
                        <h6 class="mb-0">Done</h6>
                    </div>
                    <div class="card-body p-2" id="done-tasks">
                        <!-- Tasks will be populated here -->
                    </div>
                </div>
            </div>
        `;

        const todoColumn = document.getElementById('todo-tasks');
        const inProgressColumn = document.getElementById('inprogress-tasks');
        const doneColumn = document.getElementById('done-tasks');

        teamTasks.forEach(task => {
            const assignedEmployee = allEmployees.find(e => e.employeeId === task.assignedTo);
            const card = document.createElement('div');
            card.className = 'card mb-2';
            card.innerHTML = `
                <div class="card-body p-3">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="card-title mb-0">${task.title}</h6>
                        <div class="d-flex align-items-center gap-2">
                            <span class="badge ${getBadgeClass(task.priority)}">${task.priority}</span>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteTask('${task.taskId}')" title="Delete Task">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <p class="card-text small text-muted mb-2">${task.description}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">
                            <i class="fas fa-calendar me-1"></i>${formatDate(task.dueDate)}
                        </small>
                        <small class="text-muted">
                            <i class="fas fa-user me-1"></i>${assignedEmployee ? assignedEmployee.name : 'Unknown'}
                        </small>
                    </div>
                </div>
            `;

            // Add to appropriate column based on status
            switch (task.status) {
                case 'To-Do':
                    todoColumn.appendChild(card);
                    break;
                case 'In-Progress':
                    inProgressColumn.appendChild(card);
                    break;
                case 'Done':
                    doneColumn.appendChild(card);
                    break;
            }
        });
    }

    function getBadgeClass(priority) {
        switch (priority) {
            case 'Critical': return 'bg-dark';
            case 'High': return 'bg-danger';
            case 'Medium': return 'bg-warning';
            case 'Low': return 'bg-success';
            default: return 'bg-secondary';
        }
    }

    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }

    function setupTaskFilterButtons(managerId) {
        // Filter button for task board
        const filterBtn = document.querySelector('.card-header .btn-outline-light');
        if (filterBtn && filterBtn.textContent.includes('Filter')) {
            filterBtn.addEventListener('click', () => {
                showTaskFilterModal(managerId);
            });
        }

        // Refresh button for task board
        const refreshBtn = document.querySelector('.card-header .btn-light');
        if (refreshBtn && refreshBtn.textContent.includes('Refresh')) {
            refreshBtn.addEventListener('click', () => {
                renderTeamTasks();
                if (typeof showBootstrapToast === 'function') {
                    showBootstrapToast('Task board refreshed successfully!', 'success');
                }
            });
        }
    }

    function showTaskFilterModal(managerId) {
        const modalHTML = `
            <div class="modal fade" id="taskFilterModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Filter Tasks</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label">Assigned To</label>
                                <select id="filterTaskEmployee" class="form-select">
                                    <option value="">All Team Members</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Status</label>
                                <select id="filterTaskStatus" class="form-select">
                                    <option value="">All Status</option>
                                    <option value="To-Do">To-Do</option>
                                    <option value="In-Progress">In Progress</option>
                                    <option value="Done">Done</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Priority</label>
                                <select id="filterTaskPriority" class="form-select">
                                    <option value="">All Priorities</option>
                                    <option value="High">High</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Low">Low</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Due Date Range</label>
                                <div class="row">
                                    <div class="col-6">
                                        <input type="date" id="filterTaskDateFrom" class="form-control" placeholder="From">
                                    </div>
                                    <div class="col-6">
                                        <input type="date" id="filterTaskDateTo" class="form-control" placeholder="To">
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="applyTaskFilter()">Apply Filter</button>
                            <button type="button" class="btn btn-outline-primary" onclick="clearTaskFilter()">Clear</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('taskFilterModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Populate employee dropdown
        populateTaskEmployeeFilter(managerId);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('taskFilterModal'));
        modal.show();
    }

    function populateTaskEmployeeFilter(managerId) {
        const allEmployees = getEmployees();
        const teamMembers = allEmployees.filter(emp => emp.managerId === loggedInUser.id);
        
        const employeeSelect = document.getElementById('filterTaskEmployee');
        if (employeeSelect) {
            teamMembers.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp.employeeId;
                option.textContent = emp.name;
                employeeSelect.appendChild(option);
            });
        }
    }

    // Render needs attention section
    function renderNeedsAttention(managerId) {
        const needsAttentionList = document.getElementById('needs-attention-list');
        if (!needsAttentionList) return;

        const allTasks = JSON.parse(localStorage.getItem('tasks')) || [];
        const extensionRequests = JSON.parse(localStorage.getItem('extensionRequests')) || [];
        
        // Get overdue tasks for this manager's team
        const teamMembers = getEmployees().filter(emp => emp.managerId === loggedInUser.id);
        const teamMemberIds = teamMembers.map(member => member.employeeId);
        
        const overdueTasks = allTasks.filter(task => 
            task.assignedBy === loggedInUser.employeeId &&
            teamMemberIds.includes(task.assignedTo) &&
            task.status !== 'Done' &&
            new Date(task.dueDate) < new Date()
        );
        
        // Get pending extension requests for this manager
        const pendingExtensions = extensionRequests.filter(req => 
            req.managerId === loggedInUser.employeeId && 
            req.status === 'Pending'
        );

        if (overdueTasks.length === 0 && pendingExtensions.length === 0) {
            needsAttentionList.innerHTML = '<p class="text-center text-muted">No items need attention at this time.</p>';
            return;
        }

        let html = '';
        
        // Render overdue tasks
        if (overdueTasks.length > 0) {
            html += '<h6 class="text-danger mb-3"><i class="fas fa-exclamation-circle me-2"></i>Overdue Tasks</h6>';
            overdueTasks.forEach(task => {
                const employee = teamMembers.find(emp => emp.employeeId === task.assignedTo);
                const daysOverdue = Math.floor((new Date() - new Date(task.dueDate)) / (1000 * 60 * 60 * 24));
                
                html += `
                    <div class="alert alert-danger d-flex justify-content-between align-items-center mb-2">
                        <div>
                            <strong>${task.title}</strong><br>
                            <small>Assigned to: ${employee ? employee.name : 'Unknown'} | ${daysOverdue} day(s) overdue</small>
                        </div>
                        <div>
                            <span class="badge ${getBadgeClass(task.priority)}">${task.priority}</span>
                        </div>
                    </div>
                `;
            });
        }
        
        // Render extension requests
        if (pendingExtensions.length > 0) {
            html += '<h6 class="text-warning mb-3 mt-4"><i class="fas fa-clock me-2"></i>Extension Requests</h6>';
            pendingExtensions.forEach(request => {
                html += `
                    <div class="alert alert-warning d-flex justify-content-between align-items-center mb-2">
                        <div>
                            <strong>${request.taskTitle}</strong><br>
                            <small>Requested by: ${request.employeeName} | New deadline: ${formatDate(request.requestedDeadline)}</small><br>
                            <small class="text-muted">Reason: ${request.reason}</small>
                        </div>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-success" onclick="approveExtension('${request.id}')">
                                <i class="fas fa-check"></i> Approve
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="rejectExtension('${request.id}')">
                                <i class="fas fa-times"></i> Reject
                            </button>
                        </div>
                    </div>
                `;
            });
        }
        
        needsAttentionList.innerHTML = html;
    }

    // Check for overdue tasks and apply penalties
    function checkOverdueTasks(managerId) {
        const allTasks = JSON.parse(localStorage.getItem('tasks')) || [];
        const teamMembers = getEmployees().filter(emp => emp.managerId === loggedInUser.id);
        const teamMemberIds = teamMembers.map(member => member.employeeId);
        
        const overdueTasks = allTasks.filter(task => 
            task.assignedBy === loggedInUser.employeeId &&
            teamMemberIds.includes(task.assignedTo) &&
            task.status !== 'Done' &&
            new Date(task.dueDate) < new Date() &&
            !task.penaltyApplied
        );
        
        if (overdueTasks.length > 0) {
            let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
            let payroll = JSON.parse(localStorage.getItem('payroll')) || [];
            
            overdueTasks.forEach(overdueTask => {
                // Get employee's daily pay
                const employees = getEmployees();
                const employee = employees.find(emp => emp.employeeId === overdueTask.assignedTo);
                const dailyPay = employee ? employee.dailyPay : 150; // Default daily pay
                
                // Apply penalty based on priority (percentage of daily pay)
                let penaltyPercentage = 0;
                switch (overdueTask.priority) {
                    case 'Critical': penaltyPercentage = 0.15; break; // 15%
                    case 'High': penaltyPercentage = 0.12; break;     // 12%
                    case 'Medium': penaltyPercentage = 0.08; break;   // 8%
                    case 'Low': penaltyPercentage = 0.05; break;      // 5%
                    default: penaltyPercentage = 0.05; break;
                }
                
                const penaltyAmount = Math.round(dailyPay * penaltyPercentage * 100) / 100;
                
                // Update task to mark penalty as applied
                const taskIndex = tasks.findIndex(t => t.taskId === overdueTask.taskId);
                if (taskIndex !== -1) {
                    tasks[taskIndex].penaltyApplied = true;
                    tasks[taskIndex].penaltyAmount = penaltyAmount;
                    tasks[taskIndex].penaltyPercentage = penaltyPercentage * 100;
                }
                
                // Apply penalty to payroll
                const employeePayroll = payroll.find(p => p.employeeId === overdueTask.assignedTo);
                if (employeePayroll) {
                    if (!employeePayroll.deductions) employeePayroll.deductions = [];
                    employeePayroll.deductions.push({
                        type: 'Task Overdue',
                        amount: penaltyAmount,
                        description: `Overdue task: ${overdueTask.title} (${penaltyPercentage * 100}% of daily pay)`,
                        date: new Date().toISOString().split('T')[0]
                    });
                }
            });
            
            localStorage.setItem('tasks', JSON.stringify(tasks));
            localStorage.setItem('payroll', JSON.stringify(payroll));
        }
    }

    // Extension request handlers
    window.approveExtension = function(requestId) {
        let extensionRequests = JSON.parse(localStorage.getItem('extensionRequests')) || [];
        let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        
        const requestIndex = extensionRequests.findIndex(req => req.id === requestId);
        if (requestIndex === -1) return;
        
        const request = extensionRequests[requestIndex];
        
        // Update the task deadline
        const taskIndex = tasks.findIndex(task => task.taskId === request.taskId);
        if (taskIndex !== -1) {
            tasks[taskIndex].dueDate = request.requestedDeadline;
            tasks[taskIndex].extensionApproved = true;
        }
        
        // Update request status
        extensionRequests[requestIndex].status = 'Approved';
        extensionRequests[requestIndex].approvedAt = new Date().toISOString();
        
        localStorage.setItem('extensionRequests', JSON.stringify(extensionRequests));
        localStorage.setItem('tasks', JSON.stringify(tasks));
        
        renderNeedsAttention(loggedInUser.employeeId);
        renderTeamTasks();
        showBootstrapToast('Extension request approved successfully!', 'success');
    };

    window.rejectExtension = function(requestId) {
        let extensionRequests = JSON.parse(localStorage.getItem('extensionRequests')) || [];
        
        const requestIndex = extensionRequests.findIndex(req => req.id === requestId);
        if (requestIndex === -1) return;
        
        // Update request status
        extensionRequests[requestIndex].status = 'Rejected';
        extensionRequests[requestIndex].rejectedAt = new Date().toISOString();
        
        localStorage.setItem('extensionRequests', JSON.stringify(extensionRequests));
        
        renderNeedsAttention(loggedInUser.employeeId);
        showBootstrapToast('Extension request rejected', 'info');
    };

    // Make functions globally accessible
    window.applyTaskFilter = function() {
        const filterEmployee = document.getElementById('filterTaskEmployee').value;
        const filterStatus = document.getElementById('filterTaskStatus').value;
        const filterPriority = document.getElementById('filterTaskPriority').value;
        const filterDateFrom = document.getElementById('filterTaskDateFrom').value;
        const filterDateTo = document.getElementById('filterTaskDateTo').value;
        
        renderTeamTasks({
            employee: filterEmployee,
            status: filterStatus,
            priority: filterPriority,
            dateFrom: filterDateFrom,
            dateTo: filterDateTo
        });
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('taskFilterModal'));
        modal.hide();
        
        if (typeof showBootstrapToast === 'function') {
            showBootstrapToast('Filter applied successfully!', 'success');
        }
    };

    window.clearTaskFilter = function() {
        document.getElementById('filterTaskEmployee').value = '';
        document.getElementById('filterTaskStatus').value = '';
        document.getElementById('filterTaskPriority').value = '';
        document.getElementById('filterTaskDateFrom').value = '';
        document.getElementById('filterTaskDateTo').value = '';
        
        renderTeamTasks();
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('taskFilterModal'));
        modal.hide();
        
        if (typeof showBootstrapToast === 'function') {
            showBootstrapToast('Filter cleared successfully!', 'success');
        }
    };
});

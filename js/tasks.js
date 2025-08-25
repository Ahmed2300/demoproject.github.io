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
    const kanbanBoard = document.getElementById('kanban-board');

    initializeData().then(() => {
        renderTasksBoard();
    });

    function renderTasksBoard() {
        const allTasks = JSON.parse(localStorage.getItem('tasks')) || [];
        const employeeTasks = allTasks.filter(task => task.assignedTo === currentEmployeeId);

        // Create Kanban columns
        kanbanBoard.innerHTML = `
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

        if (employeeTasks.length === 0) {
            todoColumn.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">No tasks assigned</p>';
            return;
        }

        employeeTasks.forEach(task => {
            const card = document.createElement('div');
            card.className = 'card mb-2';
            card.innerHTML = `
                <div class="card-body p-3">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="card-title mb-0">${task.title}</h6>
                        <span class="badge ${getBadgeClass(task.priority)}">${task.priority}</span>
                    </div>
                    <p class="card-text small text-muted mb-2">${task.description}</p>
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <small class="text-muted">
                            <i class="fas fa-calendar me-1"></i>${formatDate(task.dueDate)}
                        </small>
                        <div class="task-actions">
                            ${task.status !== 'Done' ? `
                                <button onclick="updateTaskStatus('${task.taskId}', '${getNextStatus(task.status)}')" class="btn btn-sm btn-primary">
                                    <i class="fas fa-arrow-right me-1"></i>${getNextStatus(task.status)}
                                </button>
                            ` : '<span class="badge bg-success">Completed</span>'}
                        </div>
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        <button onclick="showTaskDetails('${task.taskId}')" class="btn btn-sm btn-outline-info">
                            <i class="fas fa-eye me-1"></i>Details
                        </button>
                        ${isDeadlineApproaching(task.dueDate) && task.status !== 'Done' ? `
                            <button onclick="requestExtension('${task.taskId}')" class="btn btn-sm btn-warning">
                                <i class="fas fa-clock me-1"></i>Extend
                            </button>
                        ` : ''}
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

    function getNextStatus(currentStatus) {
        switch (currentStatus) {
            case 'To-Do': return 'Start';
            case 'In-Progress': return 'Complete';
            case 'Done': return 'Done';
            default: return 'Start';
        }
    }

    // Make functions globally available
    window.updateTaskStatus = function(taskId, action) {
        let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        const taskIndex = tasks.findIndex(task => task.taskId === taskId);
        
        if (taskIndex !== -1) {
            if (action === 'Start') {
                tasks[taskIndex].status = 'In-Progress';
                tasks[taskIndex].startedAt = new Date().toISOString();
            } else if (action === 'Complete') {
                tasks[taskIndex].status = 'Done';
                tasks[taskIndex].completedAt = new Date().toISOString();
            }
            
            localStorage.setItem('tasks', JSON.stringify(tasks));
            renderTasksBoard();
            showBootstrapToast(`Task ${action === 'Start' ? 'started' : 'completed'} successfully!`, 'success');
        }
    };

    window.showTaskDetails = function(taskId) {
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        const task = tasks.find(t => t.taskId === taskId);
        if (!task) return;

        const modalHTML = `
            <div class="modal fade" id="taskDetailsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Task Details</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-3">
                                <div class="col-md-8">
                                    <h6 class="fw-bold">${task.title}</h6>
                                    <p class="text-muted">${task.description}</p>
                                </div>
                                <div class="col-md-4">
                                    <span class="badge ${getBadgeClass(task.priority)} mb-2">${task.priority} Priority</span><br>
                                    <span class="badge ${getStatusBadgeClass(task.status)}">${task.status}</span>
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <strong>Due Date:</strong><br>
                                    <span class="${isOverdue(task.dueDate) && task.status !== 'Done' ? 'text-danger' : 'text-muted'}">
                                        <i class="fas fa-calendar me-1"></i>${formatDate(task.dueDate)}
                                        ${isOverdue(task.dueDate) && task.status !== 'Done' ? ' (Overdue)' : ''}
                                    </span>
                                </div>
                                <div class="col-md-6">
                                    <strong>Assigned By:</strong><br>
                                    <span class="text-muted">${getManagerName(task.assignedBy)}</span>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label fw-bold">Add Comment:</label>
                                <textarea id="taskComment" class="form-control" rows="3" placeholder="Add your comment or progress update..."></textarea>
                            </div>
                            <div class="mb-3">
                                <label class="form-label fw-bold">Comments History:</label>
                                <div id="commentsHistory" class="border rounded p-2" style="max-height: 200px; overflow-y: auto;">
                                    ${renderComments(task.comments || [])}
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-primary" onclick="addComment('${task.taskId}')">Add Comment</button>
                            ${task.status !== 'Done' ? `
                                <button type="button" class="btn btn-success" onclick="updateTaskStatus('${task.taskId}', '${getNextStatus(task.status)}'); bootstrap.Modal.getInstance(document.getElementById('taskDetailsModal')).hide();">
                                    <i class="fas fa-arrow-right me-1"></i>${getNextStatus(task.status)}
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = new bootstrap.Modal(document.getElementById('taskDetailsModal'));
        modal.show();
        
        document.getElementById('taskDetailsModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    };

    window.addComment = function(taskId) {
        const commentText = document.getElementById('taskComment').value.trim();
        if (!commentText) {
            showBootstrapToast('Please enter a comment', 'warning');
            return;
        }

        let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        const taskIndex = tasks.findIndex(task => task.taskId === taskId);
        
        if (taskIndex !== -1) {
            if (!tasks[taskIndex].comments) {
                tasks[taskIndex].comments = [];
            }
            
            tasks[taskIndex].comments.push({
                id: Date.now(),
                text: commentText,
                author: loggedInUser.name,
                timestamp: new Date().toISOString()
            });
            
            localStorage.setItem('tasks', JSON.stringify(tasks));
            document.getElementById('taskComment').value = '';
            document.getElementById('commentsHistory').innerHTML = renderComments(tasks[taskIndex].comments);
            showBootstrapToast('Comment added successfully!', 'success');
        }
    };

    window.requestExtension = function(taskId) {
        const modalHTML = `
            <div class="modal fade" id="extensionModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Request Deadline Extension</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label">New Deadline:</label>
                                <input type="date" id="newDeadline" class="form-control" min="${new Date().toISOString().split('T')[0]}">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Reason for Extension:</label>
                                <textarea id="extensionReason" class="form-control" rows="3" placeholder="Please explain why you need an extension..." required></textarea>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-warning" onclick="submitExtensionRequest('${taskId}')">Request Extension</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = new bootstrap.Modal(document.getElementById('extensionModal'));
        modal.show();
        
        document.getElementById('extensionModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    };

    window.submitExtensionRequest = function(taskId) {
        const newDeadline = document.getElementById('newDeadline').value;
        const reason = document.getElementById('extensionReason').value.trim();
        
        if (!newDeadline || !reason) {
            showBootstrapToast('Please fill in all fields', 'warning');
            return;
        }

        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        const task = tasks.find(t => t.taskId === taskId);
        if (!task) return;

        // Create extension request
        const extensionRequests = JSON.parse(localStorage.getItem('extensionRequests')) || [];
        const extensionRequest = {
            id: `EXT${Date.now()}`,
            taskId: taskId,
            taskTitle: task.title,
            employeeId: loggedInUser.employeeId,
            employeeName: loggedInUser.name,
            managerId: task.assignedBy,
            currentDeadline: task.dueDate,
            requestedDeadline: newDeadline,
            reason: reason,
            status: 'Pending',
            requestedAt: new Date().toISOString()
        };

        extensionRequests.push(extensionRequest);
        localStorage.setItem('extensionRequests', JSON.stringify(extensionRequests));

        bootstrap.Modal.getInstance(document.getElementById('extensionModal')).hide();
        showBootstrapToast('Extension request submitted successfully!', 'success');
    };

    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }

    function isDeadlineApproaching(dueDate) {
        const now = new Date();
        const deadline = new Date(dueDate);
        const timeDiff = deadline.getTime() - now.getTime();
        const hoursDiff = timeDiff / (1000 * 3600);
        return hoursDiff <= 48 && hoursDiff > 0; // Within 48 hours
    }

    function isOverdue(dueDate) {
        const now = new Date();
        const deadline = new Date(dueDate);
        return now > deadline;
    }

    function getStatusBadgeClass(status) {
        switch (status) {
            case 'To-Do': return 'bg-primary';
            case 'In-Progress': return 'bg-warning';
            case 'Done': return 'bg-success';
            default: return 'bg-secondary';
        }
    }

    function getManagerName(managerId) {
        const employees = JSON.parse(localStorage.getItem('employees')) || [];
        const manager = employees.find(emp => emp.employeeId === managerId);
        return manager ? manager.name : 'Unknown Manager';
    }

    function renderComments(comments) {
        if (!comments || comments.length === 0) {
            return '<p class="text-muted text-center">No comments yet</p>';
        }
        
        return comments.map(comment => `
            <div class="border-bottom pb-2 mb-2">
                <div class="d-flex justify-content-between">
                    <strong>${comment.author}</strong>
                    <small class="text-muted">${formatDateTime(comment.timestamp)}</small>
                </div>
                <p class="mb-0">${comment.text}</p>
            </div>
        `).join('');
    }

    function formatDateTime(dateString) {
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }

    // Check for deadline reminders
    function checkDeadlineReminders() {
        const allTasks = JSON.parse(localStorage.getItem('tasks')) || [];
        const employeeTasks = allTasks.filter(task => 
            task.assignedTo === currentEmployeeId && 
            task.status !== 'Done'
        );

        employeeTasks.forEach(task => {
            const now = new Date();
            const deadline = new Date(task.dueDate);
            const timeDiff = deadline.getTime() - now.getTime();
            const hoursDiff = timeDiff / (1000 * 3600);

            // Show reminders at 48h, 24h, and 1h before deadline
            if (hoursDiff <= 48 && hoursDiff > 47) {
                showBootstrapToast(`Reminder: Task "${task.title}" is due in 48 hours!`, 'warning');
            } else if (hoursDiff <= 24 && hoursDiff > 23) {
                showBootstrapToast(`Reminder: Task "${task.title}" is due in 24 hours!`, 'warning');
            } else if (hoursDiff <= 1 && hoursDiff > 0) {
                showBootstrapToast(`Urgent: Task "${task.title}" is due in 1 hour!`, 'danger');
            } else if (hoursDiff <= 0) {
                showBootstrapToast(`Overdue: Task "${task.title}" is past its deadline!`, 'danger');
            }
        });
    }

    // Check reminders every 30 minutes
    setInterval(checkDeadlineReminders, 30 * 60 * 1000);
    checkDeadlineReminders(); // Check immediately on load
});

function getBadgeClass(priority) {
    switch (priority) {
        case 'Critical':
            return 'bg-dark';
        case 'High':
            return 'bg-danger';
        case 'Medium':
            return 'bg-warning';
        case 'Low':
            return 'bg-success';
        default:
            return 'bg-secondary';
    }
}

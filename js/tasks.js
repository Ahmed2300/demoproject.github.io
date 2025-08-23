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
                    <div class="d-flex justify-content-between align-items-center">
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

    // Make updateTaskStatus globally available
    window.updateTaskStatus = function(taskId, action) {
        let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        const taskIndex = tasks.findIndex(task => task.taskId === taskId);
        
        if (taskIndex !== -1) {
            if (action === 'Start') {
                tasks[taskIndex].status = 'In-Progress';
            } else if (action === 'Complete') {
                tasks[taskIndex].status = 'Done';
            }
            
            localStorage.setItem('tasks', JSON.stringify(tasks));
            renderTasksBoard();
        }
    };

    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }
});

function getBadgeClass(priority) {
    switch (priority) {
        case 'High':
            return 'bg-danger';
        case 'Medium':
            return 'bg-warning';
        case 'Low':
            return 'bg-success';
        default:
            return '';
    }
}

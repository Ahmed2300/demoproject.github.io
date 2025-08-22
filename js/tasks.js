document.addEventListener('DOMContentLoaded', () => {
    const loggedInUser = protectPage();
    if (!loggedInUser || loggedInUser.role.toLowerCase() !== 'employee') {
        console.error('Access denied: Employee role required');
        return;
    }

    const currentEmployeeId = loggedInUser.employeeId;
    const kanbanBoard = document.getElementById('tasks-board');

    initializeData().then(() => {
        renderTasksBoard();
    });

    function renderTasksBoard() {
        const allTasks = JSON.parse(localStorage.getItem('tasks')) || [];
        const employeeTasks = allTasks.filter(task => task.assignedTo === currentEmployeeId);

        // Create Kanban columns
        kanbanBoard.innerHTML = `
            <div class="kanban-column">
                <h3>To-Do</h3>
                <div class="kanban-tasks" id="todo-tasks"></div>
            </div>
            <div class="kanban-column">
                <h3>In Progress</h3>
                <div class="kanban-tasks" id="inprogress-tasks"></div>
            </div>
            <div class="kanban-column">
                <h3>Done</h3>
                <div class="kanban-tasks" id="done-tasks"></div>
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
            card.className = 'kanban-card';
            card.innerHTML = `
                <div class="kanban-card-header">
                    <h4>${task.title}</h4>
                    <span class="badge ${getBadgeClass(task.priority)}">${task.priority}</span>
                </div>
                <p>${task.description}</p>
                <div class="kanban-card-footer">
                    <small>Due: ${formatDate(task.dueDate)}</small><br>
                    <div class="task-actions">
                        ${task.status !== 'Done' ? `
                            <button onclick="updateTaskStatus('${task.taskId}', '${getNextStatus(task.status)}')" class="btn-small btn-primary">
                                ${getNextStatus(task.status)}
                            </button>
                        ` : '<span class="badge badge-approved">Completed</span>'}
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
            return 'badge-rejected';
        case 'Medium':
            return 'badge-pending';
        case 'Low':
            return 'badge-approved';
        default:
            return '';
    }
}

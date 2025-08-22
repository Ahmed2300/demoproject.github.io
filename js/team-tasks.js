document.addEventListener('DOMContentLoaded', () => {
    const loggedInUser = protectPage();
    if (!loggedInUser || loggedInUser.role.toLowerCase() !== 'manager') {
        console.error('Access denied: Manager role required');
        return;
    }

    const managerId = loggedInUser.id;
    const teamKanbanBoard = document.getElementById('team-tasks-board');
    const assignTaskForm = document.getElementById('new-task-form');
    const employeeSelect = document.getElementById('employee-id');

    initializeData().then(() => {
        const allEmployees = getEmployees();
        const teamMembers = allEmployees.filter(emp => emp.managerId === managerId);

        // Populate employee dropdown
        employeeSelect.innerHTML = '<option value="">Select Employee</option>';
        teamMembers.forEach(member => {
            const option = document.createElement('option');
            option.value = member.employeeId;
            option.textContent = member.name;
            employeeSelect.appendChild(option);
        });

        renderTeamTasks();
    });

    // Handle task assignment
    assignTaskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newTask = {
            taskId: `T${Date.now()}`,
            assignedTo: document.getElementById('employee-id').value,
            assignedBy: loggedInUser.employeeId,
            title: document.getElementById('task-title').value,
            description: document.getElementById('task-desc').value,
            priority: document.getElementById('task-priority').value,
            status: 'To-Do',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Default 7 days from now
        };

        let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        tasks.push(newTask);
        localStorage.setItem('tasks', JSON.stringify(tasks));
        renderTeamTasks();
        assignTaskForm.reset();
    });

    function renderTeamTasks() {
        const allEmployees = getEmployees();
        const teamMemberIds = allEmployees.filter(emp => emp.managerId === managerId).map(emp => emp.employeeId);
        const allTasks = JSON.parse(localStorage.getItem('tasks')) || [];
        const teamTasks = allTasks.filter(task => teamMemberIds.includes(task.assignedTo));

        // Create Kanban columns
        teamKanbanBoard.innerHTML = `
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

        teamTasks.forEach(task => {
            const assignedEmployee = allEmployees.find(e => e.employeeId === task.assignedTo);
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
                    <small>Assigned to: ${assignedEmployee ? assignedEmployee.name : 'Unknown'}</small>
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
            case 'High': return 'badge-rejected';
            case 'Medium': return 'badge-pending';
            case 'Low': return 'badge-approved';
            default: return '';
        }
    }

    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }
});

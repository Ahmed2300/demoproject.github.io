// Data Handler using localStorage

// Function to initialize data from JSON files into localStorage
async function initializeData() {
    const dataFiles = ['employees', 'attendance', 'requests', 'tasks', 'payroll'];
    console.log('Starting data initialization...');
    
    for (const file of dataFiles) {
        if (!localStorage.getItem(file)) {
            console.log(`Loading ${file}.json...`);
            try {
                const response = await fetch(`data/${file}.json`);
                console.log(`Response for ${file}.json:`, response.status, response.ok);
                if (response.ok) {
                    const data = await response.json();
                    localStorage.setItem(file, JSON.stringify(data));
                    console.log(`Successfully loaded ${file}.json with ${data.length} items`);
                } else {
                    console.error(`Failed to load ${file}.json: ${response.status}`);
                    localStorage.setItem(file, JSON.stringify([]));
                }
            } catch (error) {
                console.error(`Error loading ${file}.json:`, error);
                localStorage.setItem(file, JSON.stringify([]));
            }
        } else {
            console.log(`${file}.json already exists in localStorage`);
        }
    }
    
    // Log final state
    const employees = JSON.parse(localStorage.getItem('employees') || '[]');
    console.log('Final employees data:', employees);
}

// --- Employee Functions ---
function getEmployees() {
    const employees = localStorage.getItem('employees');
    return employees ? JSON.parse(employees) : [];
}

// --- Attendance Functions ---
function getAttendanceByEmployee(employeeId) {
    const attendance = JSON.parse(localStorage.getItem('attendance')) || [];
    return attendance.filter(record => record.employeeId === employeeId);
}

function saveAttendanceRecord(record) {
    const attendance = JSON.parse(localStorage.getItem('attendance')) || [];
    attendance.push(record);
    localStorage.setItem('attendance', JSON.stringify(attendance));
}

// --- Task Functions ---
function getTasksByEmployee(employeeId) {
    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    return tasks.filter(task => task.assignedTo === employeeId);
}

function updateTask(updatedTask) {
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    tasks = tasks.map(task => task.taskId === updatedTask.taskId ? updatedTask : task);
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// --- Request Functions ---
function getRequestsByEmployee(employeeId) {
    const requests = JSON.parse(localStorage.getItem('requests')) || [];
    return requests.filter(request => request.employeeId === employeeId);
}

function getRequestsByManager(managerId) {
    const requests = JSON.parse(localStorage.getItem('requests')) || [];
    return requests.filter(request => request.managerId === managerId);
}

function getAllRequests() {
    return JSON.parse(localStorage.getItem('requests')) || [];
}

function saveRequest(request) {
    const requests = JSON.parse(localStorage.getItem('requests')) || [];
    request.requestId = Date.now().toString();
    request.submittedDate = new Date().toISOString().split('T')[0];
    request.status = 'Pending';
    requests.push(request);
    localStorage.setItem('requests', JSON.stringify(requests));
    return request;
}

function updateRequestStatus(requestId, status) {
    let requests = JSON.parse(localStorage.getItem('requests')) || [];
    requests = requests.map(request => request.requestId === requestId ? { ...request, status } : request);
    localStorage.setItem('requests', JSON.stringify(requests));
}

// --- Additional Helper Functions ---
function getAllAttendance() {
    return JSON.parse(localStorage.getItem('attendance')) || [];
}

function getAllTasks() {
    return JSON.parse(localStorage.getItem('tasks')) || [];
}

function saveTask(task) {
    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    task.taskId = Date.now().toString();
    task.createdDate = new Date().toISOString().split('T')[0];
    tasks.push(task);
    localStorage.setItem('tasks', JSON.stringify(tasks));
    return task;
}

function updateEmployee(employeeId, updates) {
    let employees = JSON.parse(localStorage.getItem('employees')) || [];
    employees = employees.map(emp => emp.employeeId === employeeId ? { ...emp, ...updates } : emp);
    localStorage.setItem('employees', JSON.stringify(employees));
}

// Initialize data on script load
initializeData();

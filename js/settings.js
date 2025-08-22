document.addEventListener('DOMContentLoaded', () => {
    const loggedInUser = protectPage();
    if (!loggedInUser || (loggedInUser.role.toLowerCase() !== 'admin' && loggedInUser.role.toLowerCase() !== 'hr')) {
        window.location.href = 'index.html';
        return;
    }

    const employeeSelect = document.getElementById('employee-select');
    const updateForm = document.getElementById('update-employee-form');
    const addForm = document.getElementById('add-employee-form');

    // Initialize data
    initializeData().then(() => {
        loadEmployees();
    });

    // Load employees into the select dropdown
    function loadEmployees() {
        const employees = getEmployees();
        employeeSelect.innerHTML = '<option value="">Choose an employee...</option>';
        
        employees.forEach(employee => {
            const option = document.createElement('option');
            option.value = employee.employeeId;
            option.textContent = `${employee.name} (${employee.role})`;
            employeeSelect.appendChild(option);
        });
    }

    // Handle employee selection to populate current values
    employeeSelect.addEventListener('change', (e) => {
        const employeeId = e.target.value;
        if (!employeeId) return;

        const employees = getEmployees();
        const employee = employees.find(emp => emp.employeeId === employeeId);
        
        if (employee) {
            document.getElementById('role-select').value = employee.role;
            document.getElementById('department-select').value = employee.department;
        }
    });

    // Handle update form submission
    updateForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const employeeId = employeeSelect.value;
        const newRole = document.getElementById('role-select').value;
        const newDepartment = document.getElementById('department-select').value;
        
        if (!employeeId || !newRole || !newDepartment) {
            showNotification('Please fill in all fields', 'warning');
            return;
        }
        
        // Update employee
        const employees = getEmployees();
        const employeeIndex = employees.findIndex(emp => emp.employeeId === employeeId);
        
        if (employeeIndex !== -1) {
            employees[employeeIndex].role = newRole;
            employees[employeeIndex].department = newDepartment;
            
            // Save updated employees
            localStorage.setItem('employees', JSON.stringify(employees));
            
            showNotification('Employee updated successfully!', 'success');
            updateForm.reset();
            loadEmployees(); // Refresh the dropdown
        } else {
            showNotification('Employee not found', 'danger');
        }
    });

    // Handle add employee form submission
    addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('new-employee-name').value.trim();
        const email = document.getElementById('new-employee-email').value.trim();
        const role = document.getElementById('new-employee-role').value;
        const department = document.getElementById('new-employee-department').value;
        
        if (!name || !email || !role || !department) {
            showNotification('Please fill in all fields', 'warning');
            return;
        }
        
        const employees = getEmployees();
        
        // Check if email already exists
        if (employees.some(emp => emp.email.toLowerCase() === email.toLowerCase())) {
            showNotification('Email already exists', 'danger');
            return;
        }
        
        // Generate new employee ID
        const maxId = Math.max(...employees.map(emp => parseInt(emp.employeeId.replace('EMP', ''))), 0);
        const newEmployeeId = `EMP${String(maxId + 1).padStart(3, '0')}`;
        
        // Create new employee
        const newEmployee = {
            employeeId: newEmployeeId,
            name: name,
            email: email,
            role: role,
            department: department,
            password: 'password123', // Default password
            managerId: role === 'Employee' ? 'EMP002' : null // Default manager for employees
        };
        
        employees.push(newEmployee);
        localStorage.setItem('employees', JSON.stringify(employees));
        
        showNotification(`Employee ${name} added successfully! Default password: password123`, 'success');
        addForm.reset();
        loadEmployees(); // Refresh the dropdown
    });

    function showNotification(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.style.position = 'fixed';
        toast.style.top = '20px';
        toast.style.right = '20px';
        toast.style.zIndex = '9999';
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        document.body.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        setTimeout(() => toast.remove(), 5000);
    }
});

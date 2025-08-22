// Authentication Logic
document.addEventListener('DOMContentLoaded', () => {
    // Initialize data if not already present
    initializeData().then(() => {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
    });
});

async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');

    const employees = getEmployees();
    const user = employees.find(emp => emp.email.toLowerCase() === email.toLowerCase());

    // Debugging logs
    console.log('Attempting login for email:', email);
    console.log('User object found:', user);
    console.log('Password entered:', password);
    if(user) {
        console.log('Password from storage:', user.password);
        console.log('Password comparison result:', user.password === password);
    }

    if (!user) {
        errorMessage.textContent = 'Email not found. Please check your email address.';
        errorMessage.style.display = 'block';
    } else if (user.password !== password) {
        errorMessage.textContent = 'Incorrect password. Please try again.';
        errorMessage.style.display = 'block';
    } else {
        errorMessage.style.display = 'none';
        sessionStorage.setItem('loggedInUser', JSON.stringify(user));
        redirectToRolePage(user.role);
    }
}

function redirectToRolePage(role) {
    switch (role.toLowerCase()) {
        case 'employee':
            window.location.href = 'employee.html';
            break;
        case 'manager':
            window.location.href = 'manager.html';
            break;
        case 'hr':
        case 'admin':
            window.location.href = 'admin.html';
            break;
        case 'security':
            window.location.href = 'security.html';
            break;
        default:
            // Redirect to a generic dashboard or show an error
            window.location.href = 'employee.html'; 
            break;
    }
}

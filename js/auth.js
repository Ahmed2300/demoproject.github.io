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
    
    // Get form elements
    const emailField = document.getElementById('email');
    const passwordField = document.getElementById('password');
    const email = emailField.value.trim();
    const password = passwordField.value.trim();
    
    // Hide any existing messages
    hideError();
    document.getElementById('success-message').classList.add('d-none');
    
    // Validate form fields
    const isEmailValid = validateField(emailField);
    const isPasswordValid = validateField(passwordField);
    
    if (!isEmailValid || !isPasswordValid) {
        showError('Please fill in all fields correctly before signing in.');
        return;
    }
    
    // Show loading state
    setLoading(true);
    
    // Simulate network delay for better UX
    await new Promise(resolve => setTimeout(resolve, 800));
    
    try {
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
            setLoading(false);
            showError('Email address not found. Please check your email and try again.');
            emailField.classList.add('is-invalid');
        } else if (user.password !== password) {
            setLoading(false);
            showError('Incorrect password. Please check your password and try again.');
            passwordField.classList.add('is-invalid');
        } else {
            // Success
            showSuccess('Login successful! Redirecting to your dashboard...');
            sessionStorage.setItem('loggedInUser', JSON.stringify(user));
            
            // Redirect after showing success message
            setTimeout(() => {
                redirectToRolePage(user.role);
            }, 1500);
        }
    } catch (error) {
        setLoading(false);
        showError('An unexpected error occurred. Please try again.');
        console.error('Login error:', error);
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

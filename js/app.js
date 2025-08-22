function getLoggedInUser() {
    const user = sessionStorage.getItem('loggedInUser');
    return user ? JSON.parse(user) : null;
}

function protectPage() {
    const user = getLoggedInUser();
    if (!user) {
        window.location.href = 'index.html';
    }
    return user;
}

function handleLogout() {
    sessionStorage.removeItem('loggedInUser');
    window.location.href = 'index.html';
}

// Protect all pages except the login page
if (window.location.pathname.split('/').pop() !== 'index.html') {
    document.addEventListener('DOMContentLoaded', () => {
        protectPage();
    });
}

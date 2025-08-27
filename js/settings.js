document.addEventListener('DOMContentLoaded', () => {
    const loggedInUser = protectPage();
    if (!loggedInUser || (loggedInUser.role.toLowerCase() !== 'admin' && loggedInUser.role.toLowerCase() !== 'hr')) {
        window.location.href = 'index.html';
        return;
    }

    // Initialize data
    initializeData().then(() => {
        loadSettings();
    });

    // Load current settings from localStorage
    function loadSettings() {
        const settings = getSystemSettings();
        
        // Load attendance penalty settings using new JSON structure
        const latePenalty16_30 = settings.latePenalties?.find(p => p.minutes === 30)?.percent || 5;
        const latePenalty31_60 = settings.latePenalties?.find(p => p.minutes === 60)?.percent || 10;
        const latePenalty61_120 = settings.latePenalties?.find(p => p.minutes === 120)?.percent || 20;
        
        document.getElementById('late-16-30').value = latePenalty16_30;
        document.getElementById('late-31-60').value = latePenalty31_60;
        document.getElementById('late-61-120').value = latePenalty61_120;
        document.getElementById('absence-penalty').value = settings.absencePenalty?.percent || 100;
        document.getElementById('vacation-deduction').value = settings.absencePenalty?.vacationDeduction || 1;
        
        // Load overtime settings
        document.getElementById('weekday-multiplier').value = settings.overtime?.weekdayMultiplier || 1.25;
        document.getElementById('weekend-multiplier').value = settings.overtime?.weekendMultiplier || 1.5;
        
        // Load overtime policy
        const overtimePolicy = settings.overtime?.policy || 'pay';
        document.querySelector(`input[name="overtime-policy"][value="${overtimePolicy}"]`).checked = true;
        
        // Load task penalty settings using new JSON structure
        const taskLow = settings.taskPenalties?.find(p => p.priority === 'Low')?.percent || 5;
        const taskMedium = settings.taskPenalties?.find(p => p.priority === 'Medium')?.percent || 8;
        const taskHigh = settings.taskPenalties?.find(p => p.priority === 'High')?.percent || 12;
        const taskCritical = settings.taskPenalties?.find(p => p.priority === 'Critical')?.percent || 15;
        
        document.getElementById('task-low-penalty').value = taskLow;
        document.getElementById('task-medium-penalty').value = taskMedium;
        document.getElementById('task-high-penalty').value = taskHigh;
        document.getElementById('task-critical-penalty').value = taskCritical;
        
        // Load payroll settings
        document.getElementById('monthly-deduction-cap').value = settings.deductionCapPercent || 25;
        
        // Load incentives settings
        document.getElementById('ideal-employee-bonus').value = settings.idealEmployeeBonusPercent || 10;
        
        // Load workweek settings
        const weekendDays = settings.workweek?.weekendDays || ['friday', 'saturday'];
        ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].forEach(day => {
            document.getElementById(`${day}-weekend`).checked = weekendDays.includes(day);
        });
    }

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

// Global function to save all settings
function saveAllSettings() {
    const settings = {
        deductionCapPercent: parseInt(document.getElementById('monthly-deduction-cap').value),
        idealEmployeeBonusPercent: parseInt(document.getElementById('ideal-employee-bonus').value),
        overtime: {
            weekdayMultiplier: parseFloat(document.getElementById('weekday-multiplier').value),
            weekendMultiplier: parseFloat(document.getElementById('weekend-multiplier').value),
            policy: document.querySelector('input[name="overtime-policy"]:checked').value
        },
        latePenalties: [
            { minutes: 30, percent: parseInt(document.getElementById('late-16-30').value) },
            { minutes: 60, percent: parseInt(document.getElementById('late-31-60').value) },
            { minutes: 120, percent: parseInt(document.getElementById('late-61-120').value) }
        ],
        taskPenalties: [
            { priority: "Low", percent: parseInt(document.getElementById('task-low-penalty').value) },
            { priority: "Medium", percent: parseInt(document.getElementById('task-medium-penalty').value) },
            { priority: "High", percent: parseInt(document.getElementById('task-high-penalty').value) },
            { priority: "Critical", percent: parseInt(document.getElementById('task-critical-penalty').value) }
        ],
        absencePenalty: {
            percent: parseInt(document.getElementById('absence-penalty').value),
            vacationDeduction: parseInt(document.getElementById('vacation-deduction').value)
        },
        workweek: {
            weekendDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
                .filter(day => document.getElementById(`${day}-weekend`).checked)
        }
    };
    
    saveSystemSettings(settings);
    
    // Show success notification
    const toast = document.createElement('div');
    toast.className = 'toast align-items-center text-white bg-success border-0';
    toast.setAttribute('role', 'alert');
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.zIndex = '9999';
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">All settings saved successfully!</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    document.body.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    setTimeout(() => toast.remove(), 5000);
}

const socket = io();

// 1. WebSocket Connection Status Indicator
const wsIndicator = document.getElementById('ws-indicator');
const wsStatusText = document.getElementById('ws-status-text');

socket.on('connect', () => {
    wsIndicator.classList.add('connected');
    wsStatusText.textContent = 'Connected to Gateway Hub';
    addLog('System', 'Connected to Gateway WebSocket', 'success');
});

socket.on('disconnect', () => {
    wsIndicator.classList.remove('connected');
    wsStatusText.textContent = 'Disconnected. Reconnecting...';
    addLog('System', 'Lost connection to Gateway', 'alert');
});

// 2. Chart.js Setup for Streaming Climate Data (Feature 1 & 2)
const ctx = document.getElementById('temperatureChart').getContext('2d');

// Gradient colors
const gradientFill = ctx.createLinearGradient(0, 0, 0, 400);
gradientFill.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
gradientFill.addColorStop(1, 'rgba(59, 130, 246, 0.05)');

const chartConfig = {
    type: 'line',
    data: {
        labels: [], // Timestamps
        datasets: [{
            label: 'Temperature (°C)',
            data: [],
            borderColor: '#3b82f6',
            backgroundColor: gradientFill,
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#fff',
            pointBorderColor: '#3b82f6',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false }
        },
        scales: {
            y: {
                beginAtZero: false,
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: '#94a3b8' }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#94a3b8', maxTicksLimit: 6 }
            }
        },
        animation: { duration: 400 }
    }
};

const myChart = new Chart(ctx, chartConfig);

const maxDataPoints = 15;

// Handling Climate Data from Server
socket.on('climate_data', (data) => {
    // Add data to chart
    if(myChart.data.labels.length > maxDataPoints) {
        myChart.data.labels.shift();
        myChart.data.datasets[0].data.shift();
    }
    
    myChart.data.labels.push(data.timestamp);
    myChart.data.datasets[0].data.push(data.temperature);
    myChart.update();

    // Log the data occasionally so we don't spam the UI, or just update silently.
    // We update chart dynamically.
});

// 3. Server-Initiated Events (Feature 3)
socket.on('server_alert', (data) => {
    addLog('Server Broadcast', data.message, 'server');
    showToast('📣 Server Broadcast', data.message);
});

socket.on('energy_alert', (alert) => {
    addLog('Eco-Analytics Alert', alert.alertMessage, 'alert');
    if (alert.isCritical) {
        showToast('⚠️ CRITICAL ENERGY WARN', alert.alertMessage, true);
    }
    
    // Update dashboard counter dynamically
    if (alert.totalWattUsed !== undefined) {
        const counterEl = document.getElementById('total-watt-counter');
        counterEl.textContent = alert.totalWattUsed;
        
        // Add a quick visual pop effect
        counterEl.style.transform = 'scale(1.2)';
        setTimeout(() => counterEl.style.transform = 'scale(1)', 200);
    }
});


// Local UI State tracking
const uiDeviceStates = {
    'AC_BEDROOM': 'OFF',
    'AC_LIVING': 'OFF',
    'LAMP_KITCHEN': 'OFF'
};

function updateDeviceUI() {
    const selectedDevice = document.getElementById('unary-device').value;
    document.getElementById('device-status-title').textContent = selectedDevice + ' Status';
    
    const ind = document.getElementById('dynamic-status-indicator');
    const currentState = uiDeviceStates[selectedDevice] || 'OFF';
    
    if (currentState === 'ON') {
        ind.textContent = 'ON';
        ind.className = 'status-badge on';
    } else {
        ind.textContent = 'OFF';
        ind.className = 'status-badge off';
    }
}

function sendDynamicCommand(action) {
    const device = document.getElementById('unary-device').value;
    sendCommand(device, action);
}

// 4. Command & Control Bridge (Feature 4)
function sendCommand(device, action) {
    socket.emit('send_command_to_grpc', { deviceId: device, action: action });
    addLog('Command Sent', `Set ${device} to ${action}`, 'log-item');
}

socket.on('command_response', (response) => {
    if(response.success) {
        addLog('Command Result', response.message, 'success');
        showToast('✅ Success', response.message);
        
        
        // Update local state and refresh UI dynamically
        uiDeviceStates[response.device] = response.action;
        
        const selectedDevice = document.getElementById('unary-device').value;
        if (response.device === selectedDevice) {
            updateDeviceUI();
        }
    } else {
        addLog('Command Error', response.error, 'alert');
        showToast('❌ Failed', response.error, true);
    }
});

let isMonitorActive = false;

function startEnergyMonitor() {
    const btn = document.getElementById('btn-monitor');

    if (!isMonitorActive) {
        socket.emit('start_energy_sync');
        
        btn.innerText = "🛑 Stop Auto-Computation";
        btn.style.background = 'rgba(239, 68, 68, 0.2)';
        btn.style.color = '#ef4444';
        btn.style.borderColor = 'rgba(239, 68, 68, 0.5)';
        isMonitorActive = true;
    } else {
        socket.emit('stop_energy_sync');

        btn.innerText = "⚡ Activate Auto Energy Sync ⚡";
        btn.style.background = 'rgba(255, 255, 255, 0.1)';
        btn.style.color = '#fff';
        btn.style.borderColor = 'transparent';
        isMonitorActive = false;
    }
}

socket.on('activity_log', (msg) => {
    addLog('Data Streamed', msg, '');
});


// Utility Functions (Logs and Toasts)
function addLog(title, desc, typeClass) {
    const logContainer = document.getElementById('activity-log');
    
    const currTime = new Date().toLocaleTimeString();
    
    const div = document.createElement('div');
    div.className = `log-item ${typeClass}`;
    div.innerHTML = `<span class="time">[${currTime}]</span> <strong>${title}:</strong> ${desc}`;
    
    logContainer.prepend(div);
    
    // Kept to latest 30 logs
    if (logContainer.children.length > 30) {
        logContainer.removeChild(logContainer.lastChild);
    }
}

function showToast(title, message, isError = false) {
    const container = document.getElementById('notification-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    const icon = isError ? '🛑' : '🔔';
    const color = isError ? '#ef4444' : '#3b82f6';
    
    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-content" style="border-left: 2px solid ${color}; padding-left: 10px;">
            <h4 style="color: ${color}">${title}</h4>
            <p>${message}</p>
        </div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Initialize UI state
updateDeviceUI();

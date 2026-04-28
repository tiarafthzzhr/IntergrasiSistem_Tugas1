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
    if(myChart.data.labels.length > maxDataPoints) {
        myChart.data.labels.shift();
        myChart.data.datasets[0].data.shift();
    }
    
    myChart.data.labels.push(data.timestamp);
    myChart.data.datasets[0].data.push(data.temperature);
    myChart.update();
});

// 3. Server-Initiated Events (Feature 3)
socket.on('server_alert', (data) => {
    addLog('Server Broadcast', data.message, 'server');
    showToast('📣 Server Broadcast', data.message);
});

// === ENERGY TRACKING STATE ===
const deviceEnergyData = {}; // { deviceId: { kwh, cost, minutes, watt, threshold, name } }

socket.on('energy_alert', (alert) => {
    const deviceId = alert.deviceId;
    
    if (!deviceId || deviceId === 'SYSTEM_SYNC') return;

    // Store/update energy data per device
    deviceEnergyData[deviceId] = {
        kwh: alert.energyKwh || 0,
        cost: alert.estimatedCost || 0,
        minutes: alert.runningMinutes || 0,
        watt: alert.wattPerHour || 0,
        threshold: alert.thresholdKwh || 0,
        name: alert.deviceName || deviceId,
        isCritical: alert.isCritical || false,
        isSummary: alert.isSummary || false
    };

    // Update the per-device energy cards
    renderEnergyCards();
    updateTotalCounters();

    // Show critical alert as toast
    if (alert.isCritical) {
        showToast('⚠️ BATAS LISTRIK!', alert.alertMessage, true);
        addLog('⚡ Energy Alert', alert.alertMessage, 'alert');
    }

    // Show summary when device turned OFF
    if (alert.isSummary) {
        showToast('📊 Ringkasan Pemakaian', alert.alertMessage, false);
        addLog('📊 Summary', alert.alertMessage, 'success');
        // Remove this device from active tracking after showing summary
        setTimeout(() => {
            delete deviceEnergyData[deviceId];
            renderEnergyCards();
            updateTotalCounters();
        }, 5000);
    }
});

function renderEnergyCards() {
    const container = document.getElementById('energy-cards-container');
    container.innerHTML = '';

    const activeDevices = Object.entries(deviceEnergyData);
    
    if (activeDevices.length === 0) {
        container.innerHTML = `<div style="text-align:center; color:var(--text-secondary); padding:1rem; font-size:0.9rem;">Tidak ada device yang aktif. Nyalakan device untuk mulai tracking.</div>`;
        return;
    }

    activeDevices.forEach(([deviceId, data]) => {
        const progressPercent = data.threshold > 0 ? Math.min((data.kwh / data.threshold) * 100, 100) : 0;
        const isOverThreshold = data.kwh >= data.threshold && data.threshold > 0;
        const barColor = isOverThreshold ? 'var(--accent-red)' : 
                         progressPercent > 70 ? 'var(--accent-orange)' : 'var(--accent-green)';
        const cardBorder = isOverThreshold ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255, 255, 255, 0.08)';

        const card = document.createElement('div');
        card.className = 'device-energy-card' + (isOverThreshold ? ' threshold-exceeded' : '');
        card.style.cssText = `
            background: rgba(0,0,0,0.25);
            border: 1px solid ${cardBorder};
            border-radius: 12px;
            padding: 1rem 1.25rem;
            margin-top: 0.75rem;
            transition: all 0.3s ease;
            ${isOverThreshold ? 'animation: pulse-border 1.5s infinite;' : ''}
        `;

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                <div>
                    <strong style="color:#fff; font-size:0.95rem;">${data.name}</strong>
                    <span style="font-size:0.75rem; color:var(--text-secondary); margin-left:0.5rem;">${data.watt}W</span>
                </div>
                <div style="font-size:0.8rem; color:var(--text-secondary);">
                    ⏱ ${Number(data.minutes).toLocaleString(undefined, {maximumFractionDigits: 1})} menit
                </div>
            </div>
            
            <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:0.5rem;">
                <div style="font-size:1.5rem; font-weight:800; color:${barColor};">
                    ${data.kwh.toFixed(4)} <span style="font-size:0.8rem; font-weight:400;">kWh</span>
                </div>
                <div style="font-size:1.1rem; font-weight:600; color:var(--accent-blue);">
                    Rp${data.cost.toLocaleString()}
                </div>
            </div>

            <div style="background:rgba(255,255,255,0.08); border-radius:99px; height:8px; overflow:hidden; margin-bottom:0.4rem;">
                <div style="background:${barColor}; height:100%; width:${progressPercent}%; border-radius:99px; transition:width 0.5s ease; ${isOverThreshold ? 'box-shadow: 0 0 10px ' + barColor + ';' : ''}"></div>
            </div>
            
            <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-secondary);">
                <span>${progressPercent.toFixed(1)}% dari batas</span>
                <span>Batas: ${data.threshold} kWh</span>
            </div>

            ${isOverThreshold ? `
                <div style="margin-top:0.5rem; padding:0.5rem 0.75rem; background:rgba(239,68,68,0.15); border-radius:8px; font-size:0.8rem; color:var(--accent-red); display:flex; align-items:center; gap:0.5rem;">
                    <span style="font-size:1.2rem;">🚨</span>
                    <span>Batas tercapai! Segera matikan untuk hemat listrik!</span>
                </div>
            ` : ''}
        `;

        container.appendChild(card);
    });
}

function updateTotalCounters() {
    let totalKwh = 0;
    let totalCost = 0;

    Object.values(deviceEnergyData).forEach(data => {
        totalKwh += data.kwh;
        totalCost += data.cost;
    });

    const costEl = document.getElementById('total-cost-counter');
    const kwhEl = document.getElementById('total-kwh-counter');
    
    costEl.textContent = totalCost.toLocaleString();
    kwhEl.textContent = totalKwh.toFixed(4);

    // Pop animation
    costEl.style.transform = 'scale(1.1)';
    setTimeout(() => costEl.style.transform = 'scale(1)', 200);
}


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
        
        btn.innerText = "🛑 Stop Energy Monitoring";
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
renderEnergyCards();

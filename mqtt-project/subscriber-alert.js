const mqtt = require('mqtt');

const client = mqtt.connect('mqtt://localhost:1883', {
    clientId: 'alert_monitor_' + Math.random().toString(16).substr(2, 8)
});

const SUHU_BATAS = 28.5;

// SIMULASI FLOW CONTROL (receiveMaximum)
// Batasi maksimal 10 pesan yang sedang diproses sekaligus
const MAX_INFLIGHT = 10;
let inflightCount = 0;
const messageQueue = [];

function handleMessage(topic, message) {
    const timestamp = new Date().toLocaleTimeString('id-ID');
    const msg = message.toString();

    if (topic === 'chillarrival/sensor/suhu') {
        try {
            const data = JSON.parse(msg);

            // SIMULASI MESSAGE EXPIRY: abaikan data yang sudah kadaluarsa
            if (data.expiresAt && Date.now() > data.expiresAt) {
                console.log(`[${timestamp}] ⏱ Data suhu diabaikan — sudah kadaluarsa`);
                return;
            }

            const suhu = parseFloat(data.suhu);
            if (suhu > SUHU_BATAS) {
                const alertMsg = JSON.stringify({
                    level: 'WARNING',
                    pesan: `Suhu terlalu tinggi: ${suhu}°C (batas: ${SUHU_BATAS}°C)`,
                    waktu: timestamp
                });
                client.publish('chillarrival/alert', alertMsg, { qos: 1 });
                console.log(`[${timestamp}] ⚠️  ALERT SUHU TINGGI: ${suhu}°C`);
            } else {
                console.log(`[${timestamp}] ✅ Suhu normal: ${suhu}°C`);
            }
        } catch (e) { }
    }

    else if (topic === 'chillarrival/system/status') {
        if (msg.includes('OFFLINE') || msg.includes('CRITICAL')) {
            const alertMsg = JSON.stringify({
                level: 'CRITICAL',
                pesan: `Hub IoT tidak merespons! Status: ${msg}`,
                waktu: timestamp
            });
            client.publish('chillarrival/alert', alertMsg, { qos: 1, retain: true });
            console.log(`[${timestamp}] 🚨 ALERT SISTEM: ${msg}`);
        } else {
            console.log(`[${timestamp}] ✅ Hub IoT: ${msg}`);
        }
    }

    else if (topic.startsWith('chillarrival/energy/')) {
        try {
            const data = JSON.parse(msg);
            if (data.cost > 5000) {
                console.log(`[${timestamp}] 💰 Biaya ${data.deviceName}: Rp ${data.cost.toLocaleString('id-ID')}`);
            }
        } catch (e) { }
    }

    // selesai proses — cek antrian
    inflightCount--;
    if (messageQueue.length > 0) {
        const next = messageQueue.shift();
        inflightCount++;
        handleMessage(next.topic, next.message);
    }
}

client.on('connect', () => {
    console.log('[Alert Monitor] Terhubung ke broker.');
    console.log(`[Alert Monitor] Flow Control aktif: maks ${MAX_INFLIGHT} pesan diproses bersamaan\n`);

    client.subscribe('chillarrival/sensor/suhu', { qos: 1 });
    client.subscribe('chillarrival/system/status', { qos: 1 });
    client.subscribe('chillarrival/energy/+', { qos: 1 });
});

client.on('message', (topic, message) => {
    if (inflightCount >= MAX_INFLIGHT) {
        // antrian penuh — tahan dulu
        messageQueue.push({ topic, message });
        console.log(`[Flow Control] Antrian: ${messageQueue.length} pesan menunggu`);
        return;
    }
    inflightCount++;
    handleMessage(topic, message);
});

client.on('error', (err) => {
    console.error('[Alert Monitor] Error:', err.message);
});

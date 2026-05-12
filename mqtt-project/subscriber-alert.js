const mqtt = require('mqtt');

// MQTT 5.0 — mengaktifkan fitur receiveMaximum (flow control)
const client = mqtt.connect('mqtt://localhost:1883', {
    clientId: 'alert_monitor_' + Math.random().toString(16).substr(2, 8),
    protocolVersion: 5,
    properties: {
        // FLOW MAX: maksimal 10 pesan QoS 1/2 boleh "in-flight" sekaligus
        // broker tidak akan kirim pesan ke-11 sebelum salah satu dari 10 selesai di-acknowledge
        receiveMaximum: 10
    }
});

const SUHU_BATAS = 28.5;

client.on('connect', () => {
    console.log('[Alert Monitor] Terhubung ke broker (MQTT 5.0).');
    console.log('[Alert Monitor] Flow Control aktif: receiveMaximum = 10\n');

    client.subscribe('chillarrival/sensor/suhu', { qos: 1 });
    client.subscribe('chillarrival/system/status', { qos: 1 });
    client.subscribe('chillarrival/energy/+', { qos: 1 });
});

client.on('message', (topic, message) => {
    const timestamp = new Date().toLocaleTimeString('id-ID');
    const msg = message.toString();

    if (topic === 'chillarrival/sensor/suhu') {
        try {
            const data = JSON.parse(msg);
            const suhu = parseFloat(data.suhu);

            if (suhu > SUHU_BATAS) {
                const alertMsg = JSON.stringify({
                    level: 'WARNING',
                    pesan: `Suhu ruangan terlalu tinggi: ${suhu}°C (batas: ${SUHU_BATAS}°C)`,
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
});

client.on('error', (err) => {
    console.error('[Alert Monitor] Error:', err.message);
});

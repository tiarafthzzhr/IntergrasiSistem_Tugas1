const mqtt = require('mqtt');

// Subscriber ke-2: Sistem Alert & Monitoring
// Bertugas memantau kondisi abnormal dan mengirim peringatan balik ke broker
const client = mqtt.connect('mqtt://localhost:1883', {
    clientId: 'alert_monitor_' + Math.random().toString(16).substr(2, 8)
});

const SUHU_BATAS = 28.5; // Batas suhu untuk memicu alert (derajat Celsius)

client.on('connect', () => {
    console.log('[Alert Monitor] Terhubung ke broker. Memantau kondisi sistem...');

    // Subscribe dengan QoS 1 (At least once) - penting agar alert tidak terlewat
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
                // Publish alert dengan QoS 1 agar pasti terkirim ke dashboard
                client.publish('chillarrival/alert', alertMsg, { qos: 1 });
                console.log(`[${timestamp}] ⚠️  ALERT SUHU TINGGI: ${suhu}°C`);
            } else {
                console.log(`[${timestamp}] ✅ Suhu normal: ${suhu}°C`);
            }
        } catch (e) { /* skip invalid JSON */ }
    }

    else if (topic === 'chillarrival/system/status') {
        if (msg.includes('OFFLINE') || msg.includes('CRITICAL')) {
            const alertMsg = JSON.stringify({
                level: 'CRITICAL',
                pesan: `Sistem Induk tidak merespons! Status: ${msg}`,
                waktu: timestamp
            });
            client.publish('chillarrival/alert', alertMsg, { qos: 1, retain: true });
            console.log(`[${timestamp}] 🚨 ALERT SISTEM: ${msg}`);
        } else {
            console.log(`[${timestamp}] ✅ Sistem Induk: ${msg}`);
        }
    }

    else if (topic.startsWith('chillarrival/energy/')) {
        try {
            const data = JSON.parse(msg);
            if (data.cost > 5000) {
                console.log(`[${timestamp}] 💰 Biaya ${data.deviceName} sudah mencapai Rp ${data.cost.toLocaleString('id-ID')}`);
            }
        } catch (e) { /* skip */ }
    }
});

client.on('error', (err) => {
    console.error('[Alert Monitor] Error:', err.message);
});

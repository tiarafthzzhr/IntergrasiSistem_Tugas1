const mqtt = require('mqtt');

// MQTT 5.0 — mengaktifkan fitur messageExpiryInterval
const client = mqtt.connect('mqtt://localhost:1883', {
    protocolVersion: 5
});

client.on('connect', () => {
    console.log('[Sensor Suhu] Terhubung ke broker (MQTT 5.0).');

    setInterval(() => {
        const suhu = (Math.random() * (30 - 24) + 24).toFixed(1);
        const payload = JSON.stringify({ suhu: suhu, waktu: new Date().toLocaleTimeString() });

        client.publish('chillarrival/sensor/suhu', payload, {
            qos: 0,
            properties: {
                // EXPIRE: data suhu otomatis dihapus broker setelah 10 detik
                // karena data suhu lama tidak relevan — lebih baik tidak ada daripada data basi
                messageExpiryInterval: 10
            }
        }, () => {
            console.log(`[Sensor Suhu] ${suhu}°C — kadaluarsa dalam 10 detik (QoS 0, MQTT 5.0)`);
        });
    }, 3000);
});

const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
    console.log('[Sensor Suhu] Terhubung ke broker MQTT.');
    
    setInterval(() => {
        const suhu = (Math.random() * (30 - 24) + 24).toFixed(1);
        const payload = JSON.stringify({ suhu: suhu, waktu: new Date().toLocaleTimeString() });
        
        // QoS 0 (At most once): Karena data mengalir terus, hilang satu tidak masalah
        client.publish('chillarrival/sensor/suhu', payload, { qos: 0 }, () => {
            console.log(`[Sensor Suhu] Mengirim data: ${suhu}°C (QoS: 0)`);
        });
    }, 3000);
});

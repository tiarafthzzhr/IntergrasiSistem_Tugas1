const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://localhost:1883');

let isOpen = false;

client.on('connect', () => {
    console.log('[Sensor Pintu] Terhubung ke broker MQTT.');
    
    setInterval(() => {
        isOpen = !isOpen;
        const statusPintu = isOpen ? "TERBUKA" : "TERTUTUP";
        
        // QoS 1 + Retain: pesan terjamin terkirim (at-least-once) dan disimpan broker
        // sehingga subscriber baru langsung tahu status terkini tanpa harus menunggu
        client.publish('chillarrival/sensor/pintu', statusPintu, { qos: 1, retain: true }, () => {
            console.log(`[Sensor Pintu] Mengubah status pintu menjadi: ${statusPintu} (QoS: 1, Retain: true)`);
        });
    }, 10000); // Berubah setiap 10 detik
});

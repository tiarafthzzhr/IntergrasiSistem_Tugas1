const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
    console.log('[Data Logger] Terhubung ke broker. Mendengarkan semua topik...');
    
    // Subscribe ke semua topik chillarrival (menggunakan Wildcard #) dengan QoS 1
    client.subscribe('chillarrival/#', { qos: 1 });
});

client.on('message', (topic, message) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] 📩 LOG EVENT | Topik: ${topic.padEnd(25)} | Pesan: ${message.toString()}`);
});

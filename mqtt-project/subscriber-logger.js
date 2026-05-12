const mqtt = require('mqtt');

// MQTT 5.0 — mengaktifkan fitur Shared Subscription
const client = mqtt.connect('mqtt://localhost:1883', {
    clientId: 'logger_' + Math.random().toString(16).substr(2, 8),
    protocolVersion: 5
});

client.on('connect', () => {
    console.log('[Data Logger] Terhubung ke broker (MQTT 5.0).');

    // SHARED SUBSCRIPTION: format $share/{NamaGrup}/{TopikFilter}
    // Kalau ada 2 instance logger jalan bersamaan, broker otomatis bagi pesan ke keduanya
    // (load balancing) — setiap pesan hanya diterima SALAH SATU dari mereka, bukan keduanya
    client.subscribe('$share/loggers/chillarrival/#', { qos: 1 });

    console.log('[Data Logger] Shared Subscription aktif: $share/loggers/chillarrival/#');
    console.log('[Data Logger] Coba jalankan 2 instance file ini — pesan akan dibagi rata!\n');
});

client.on('message', (topic, message) => {
    const timestamp = new Date().toLocaleTimeString('id-ID');
    console.log(`[${timestamp}] 📩 LOG | Topik: ${topic.padEnd(35)} | ${message.toString().substring(0, 60)}`);
});

const mqtt = require('mqtt');

const client = mqtt.connect('mqtt://localhost:1883', {
    clientId: 'logger_' + Math.random().toString(16).substr(2, 8)
});

client.on('connect', () => {
    console.log('[Data Logger] Terhubung ke broker.');

    // Subscribe dengan wildcard ke semua topik chillarrival
    // CATATAN SHARED SUBSCRIPTION:
    // Di MQTT 5.0 format-nya: $share/{NamaGrup}/{TopikFilter}
    // Contoh: $share/loggers/chillarrival/#
    // Artinya: kalau ada 2 instance logger jalan bersamaan, broker bagi pesan ke keduanya
    // Karena broker kita (aedes) belum support MQTT 5.0, kita pakai subscribe biasa
    client.subscribe('chillarrival/#', { qos: 1 });

    console.log('[Data Logger] Subscribe: chillarrival/#');
    console.log('[Data Logger] Shared Subscription (MQTT 5.0): $share/loggers/chillarrival/#');
    console.log('[Data Logger] Coba jalankan 2 instance file ini — di MQTT 5.0 pesan akan dibagi!\n');
});

client.on('message', (topic, message) => {
    const timestamp = new Date().toLocaleTimeString('id-ID');
    console.log(`[${timestamp}] 📩 LOG | ${topic.padEnd(35)} | ${message.toString().substring(0, 60)}`);
});

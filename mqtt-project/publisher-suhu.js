const mqtt = require('mqtt');

const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
    console.log('[Sensor Suhu] Terhubung ke broker.');

    setInterval(() => {
        const suhu = (Math.random() * (30 - 24) + 24).toFixed(1);

        const payload = JSON.stringify({
            suhu: suhu,
            waktu: new Date().toLocaleTimeString('id-ID'),
            // SIMULASI MESSAGE EXPIRY: subscriber cek field ini,
            // kalau sudah lewat 10 detik dari sekarang, data diabaikan
            expiresAt: Date.now() + 10000
        });

        client.publish('chillarrival/sensor/suhu', payload, { qos: 0 }, () => {
            console.log(`[Sensor Suhu] ${suhu}°C — kadaluarsa dalam 10 detik`);
        });
    }, 3000);
});

const mqtt = require('mqtt');

const options = {
    clientId: 'iot_hub_' + Math.random().toString(16).substr(2, 8),
    will: {
        topic: 'chillarrival/system/status',
        payload: 'OFFLINE — Hub IoT mati mendadak!',
        qos: 1,
        retain: true
    }
};

const client = mqtt.connect('mqtt://127.0.0.1:1883', options);

client.on('connect', () => {
    console.log('[Hub IoT] Terhubung ke broker. LWT sudah didaftarkan.');
    client.publish('chillarrival/system/status', 'ONLINE', { retain: true });

    console.log('[Hub IoT] Status: ONLINE');
    console.log('[Hub IoT] Tekan Ctrl+C di terminal ini untuk simulasi mati listrik mendadak.');
    console.log('[Hub IoT] Broker akan otomatis kirim pesan OFFLINE ke dashboard.\n');
});

client.on('error', (err) => {
    console.error('[Hub IoT] Error:', err.message);
});

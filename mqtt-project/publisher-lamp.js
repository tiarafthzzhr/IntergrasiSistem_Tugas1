const mqtt = require('mqtt');

const options = {
    clientId: 'lamp_kitchen_' + Math.random().toString(16).substr(2, 8),
    will: {
        topic: 'chillarrival/status/LAMP_KITCHEN',
        payload: 'OFFLINE',
        qos: 1,
        retain: true
    }
};

const client = mqtt.connect('mqtt://127.0.0.1:1883', options);

let kwh = 0;
const watt = 40;
let isON = false;

client.on('connect', () => {
    console.log('[Lamp Kitchen] Sensor Energi Terhubung.');

    // informasi tentang  broker bahwa perangkat ini ONLINE
    client.publish('chillarrival/status/LAMP_KITCHEN', 'ONLINE', { retain: true });

    client.subscribe('chillarrival/command/LAMP_KITCHEN');

    setInterval(() => {
        if (!isON) return;

        kwh += (watt / 3600 / 1000) * 2;
        const cost = Math.round(kwh * 1500);

        const payload = JSON.stringify({
            deviceId: 'LAMP_KITCHEN',
            deviceName: 'Lampu Dapur',
            watt: watt,
            kwh: kwh.toFixed(4),
            cost: cost
        });

        client.publish('chillarrival/energy/LAMP_KITCHEN', payload, { retain: true });
        console.log(`[Lamp Kitchen] (Status: ON) Mengirim energi: ${kwh.toFixed(4)} kWh | Rp ${cost}`);
    }, 2000);
});

client.on('message', (topic, message) => {
    if (topic === 'chillarrival/command/LAMP_KITCHEN') {
        const action = message.toString();
        isON = (action === 'ON');
        console.log(`\n⚙️ [Lamp Kitchen] Menerima Perintah: ${action}! Lampu sekarang ${isON ? 'Menyala' : 'Mati'}.`);
    }
});

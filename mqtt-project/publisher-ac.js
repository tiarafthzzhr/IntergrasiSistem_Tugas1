const mqtt = require('mqtt');

const options = {
    clientId: 'ac_bedroom_' + Math.random().toString(16).substr(2, 8),
    will: {
        topic: 'chillarrival/status/AC_BEDROOM',
        payload: 'OFFLINE',
        qos: 1,
        retain: true
    }
};

const client = mqtt.connect('mqtt://127.0.0.1:1883', options);

let kwh = 0;
const watt = 1000;
let isON = false;

client.on('connect', () => {
    console.log('[AC Bedroom] Sensor Energi Terhubung.');

    // informasi tentang broker bahwa perangkat ini ONLINE
    client.publish('chillarrival/status/AC_BEDROOM', 'ONLINE', { retain: true });

    // QoS 2: perintah ON/OFF harus diterima tepat SATU kali — tidak boleh hilang, tidak boleh dobel
    client.subscribe('chillarrival/command/AC_BEDROOM', { qos: 2 });

    setInterval(() => {
        if (!isON) return;

        kwh += (watt / 3600 / 1000) * 2;
        const cost = Math.round(kwh * 1500);

        const payload = JSON.stringify({
            deviceId: 'AC_BEDROOM',
            deviceName: 'AC Kamar Tidur',
            watt: watt,
            kwh: kwh.toFixed(4),
            cost: cost
        });

        client.publish('chillarrival/energy/AC_BEDROOM', payload, { qos: 0 });
        console.log(`[AC Bedroom] (Status: ON) Mengirim energi: ${kwh.toFixed(4)} kWh | Rp ${cost}`);
    }, 2000);
});

client.on('message', (topic, message) => {
    if (topic === 'chillarrival/command/AC_BEDROOM') {
        const action = message.toString();
        isON = (action === 'ON');
        console.log(`\n⚙️ [AC Bedroom] Menerima Perintah: ${action}! AC sekarang ${isON ? 'Menyala' : 'Mati'}.`);
    }
});

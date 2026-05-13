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
let kwhRestored = false;

// Log QoS 2 handshake (sisi subscriber): PUBLISH → PUBREC → PUBREL → PUBCOMP
client.on('packetreceive', (packet) => {
    if (packet.cmd === 'publish' && packet.qos === 2) {
        console.log(`[QoS 2] ← PUBLISH  | msgId: ${packet.messageId} | Step 1/4: Perintah diterima dari broker`);
    } else if (packet.cmd === 'pubrel') {
        console.log(`[QoS 2] ← PUBREL   | msgId: ${packet.messageId} | Step 3/4: Broker konfirmasi PUBREC`);
    }
});
client.on('packetsend', (packet) => {
    if (packet.cmd === 'pubrec') {
        console.log(`[QoS 2] → PUBREC   | msgId: ${packet.messageId} | Step 2/4: Mengirim PUBREC ke broker`);
    } else if (packet.cmd === 'pubcomp') {
        console.log(`[QoS 2] → PUBCOMP  | msgId: ${packet.messageId} | Step 4/4: ✅ Exactly Once terkonfirmasi!\n`);
    }
});

client.on('connect', () => {
    console.log('[AC Bedroom] Sensor Energi Terhubung.');
    client.publish('chillarrival/status/AC_BEDROOM', 'ONLINE', { retain: true });

    // Baca kWh terakhir dari retained message broker sebelum mulai
    client.subscribe('chillarrival/energy/AC_BEDROOM', { qos: 0 });
    client.subscribe('chillarrival/command/AC_BEDROOM', { qos: 2 });

    // Beri waktu 800ms untuk terima retained message, lalu mulai interval
    setTimeout(() => {
        kwhRestored = true;
        console.log(`[AC Bedroom] Melanjutkan dari: ${kwh.toFixed(4)} kWh`);

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

            client.publish('chillarrival/energy/AC_BEDROOM', payload, { qos: 0, retain: true });
            console.log(`[AC Bedroom] (Status: ON) Energi: ${kwh.toFixed(4)} kWh | Rp ${cost.toLocaleString('id-ID')}`);
        }, 2000);
    }, 800);
});

client.on('message', (topic, message) => {
    if (topic === 'chillarrival/energy/AC_BEDROOM' && !kwhRestored) {
        try {
            const data = JSON.parse(message.toString());
            kwh = parseFloat(data.kwh);
            console.log(`[AC Bedroom] kWh dipulihkan dari broker: ${kwh.toFixed(4)} kWh`);
        } catch (e) {}
        return;
    }

    if (topic === 'chillarrival/command/AC_BEDROOM') {
        const action = message.toString();
        isON = (action === 'ON');
        console.log(`\n⚙️ [AC Bedroom] Menerima Perintah: ${action}! AC sekarang ${isON ? 'Menyala' : 'Mati'}.`);
    }
});

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
    console.log('[Lamp Kitchen] Sensor Energi Terhubung.');
    client.publish('chillarrival/status/LAMP_KITCHEN', 'ONLINE', { retain: true });

    // Baca kWh terakhir dari retained message broker sebelum mulai
    client.subscribe('chillarrival/energy/LAMP_KITCHEN', { qos: 0 });
    client.subscribe('chillarrival/command/LAMP_KITCHEN', { qos: 2 });

    // Beri waktu 800ms untuk terima retained message, lalu mulai interval
    setTimeout(() => {
        kwhRestored = true;
        console.log(`[Lamp Kitchen] Melanjutkan dari: ${kwh.toFixed(4)} kWh`);

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
            console.log(`[Lamp Kitchen] (Status: ON) Energi: ${kwh.toFixed(4)} kWh | Rp ${cost.toLocaleString('id-ID')}`);
        }, 2000);
    }, 800);
});

client.on('message', (topic, message) => {
    if (topic === 'chillarrival/energy/LAMP_KITCHEN' && !kwhRestored) {
        try {
            const data = JSON.parse(message.toString());
            kwh = parseFloat(data.kwh);
            console.log(`[Lamp Kitchen] kWh dipulihkan dari broker: ${kwh.toFixed(4)} kWh`);
        } catch (e) {}
        return;
    }

    if (topic === 'chillarrival/command/LAMP_KITCHEN') {
        const action = message.toString();
        isON = (action === 'ON');
        console.log(`\n⚙️ [Lamp Kitchen] Menerima Perintah: ${action}! Lampu sekarang ${isON ? 'Menyala' : 'Mati'}.`);
    }
});

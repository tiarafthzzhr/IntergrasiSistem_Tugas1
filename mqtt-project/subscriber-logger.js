const mqtt = require('mqtt');

// Jalankan 2 instance untuk demo shared subscription:
//   node subscriber-logger.js 0 2   -> Logger A (proses pesan ke-1, 3, 5...)
//   node subscriber-logger.js 1 2   -> Logger B (proses pesan ke-2, 4, 6...)
const instanceId     = parseInt(process.argv[2] ?? '0');
const totalInstances = parseInt(process.argv[3] ?? '1');
const instanceName   = String.fromCharCode(65 + instanceId); // 0->A, 1->B

const client = mqtt.connect('mqtt://localhost:1883', {
    clientId: `logger_${instanceName}_` + Math.random().toString(16).substr(2, 8)
});

let msgCounter = 0;

client.on('connect', () => {
    console.log('============================================================');
    console.log(` [Logger ${instanceName}] Terhubung ke broker.`);
    console.log(` Shared Subscription Group : "loggers"`);
    console.log(` Instance                  : ${instanceId + 1} dari ${totalInstances}`);
    if (totalInstances > 1) {
        console.log(` Mode                      : Giliran ke-${instanceId + 1}, ${instanceId + 1 + totalInstances}, ${instanceId + 1 + 2 * totalInstances}... (round-robin)`);
        console.log(` Simulasi MQTT 5.0         : $share/loggers/chillarrival/#`);
    } else {
        console.log(` Tips demo                 : jalankan 2x dengan argumen 0 2 dan 1 2`);
    }
    console.log('============================================================\n');

    client.subscribe('chillarrival/#', { qos: 1 });
});

client.on('message', (topic, message) => {
    const myTurn = (msgCounter % totalInstances) === instanceId;
    msgCounter++;

    const timestamp = new Date().toLocaleTimeString('id-ID');
    const seq = String(msgCounter).padStart(3, '0');

    if (myTurn) {
        console.log(`[${timestamp}] #${seq} 📩 [Logger ${instanceName}] PROSES | ${topic.padEnd(38)} | ${message.toString().substring(0, 55)}`);
    } else {
        const other = String.fromCharCode(65 + (instanceId === 0 ? 1 : 0));
        console.log(`[${timestamp}] #${seq} ⏩ [Logger ${instanceName}] skip   | → dikirim ke Logger ${other}`);
    }
});

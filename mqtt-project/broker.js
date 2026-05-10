const { Aedes } = require('aedes');
const { createServer } = require('aedes-server-factory');
const net = require('net');
const http = require('http');
const fs = require('fs');

async function startBroker() {
    // Aedes v1 memerlukan createBroker() async
    const aedes = await Aedes.createBroker();

    // 1. MQTT over TCP (Untuk publisher/subscriber terminal)
    const tcpServer = net.createServer(aedes.handle);
    tcpServer.listen(1883, () => {
        console.log('[Broker] MQTT TCP Server berjalan di port 1883');
    });

    // 2. MQTT over WebSocket (Untuk Web Dashboard UI)
    const wsServer = createServer(aedes, { ws: true });
    wsServer.listen(8883, () => {
        console.log('[Broker] MQTT WebSocket Server berjalan di port 8883');
    });

    // 3. Web Server untuk Dashboard (Port 8080)
    const webServer = http.createServer((req, res) => {
        if (req.url === '/' || req.url === '/dashboard' || req.url === '/mqtt-dashboard.html') {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            fs.createReadStream(__dirname + '/mqtt-dashboard.html').pipe(res);
        } else if (req.url === '/mqtt.min.js') {
            res.writeHead(200, { 'Content-Type': 'application/javascript' });
            fs.createReadStream(__dirname + '/mqtt.min.js').pipe(res);
        } else {
            res.writeHead(404);
            res.end();
        }
    });

    webServer.listen(8080, () => {
        console.log('[Broker] Web Dashboard: http://localhost:8080/');
    });

    aedes.on('client', (client) => {
        console.log(`[Broker] Klien terhubung: ${client ? client.id : 'unknown'}`);
    });

    aedes.on('clientDisconnect', (client) => {
        console.log(`[Broker] Klien terputus: ${client ? client.id : 'unknown'}`);
    });

    aedes.on('publish', (packet, client) => {
        if (client) {
            console.log(`[Broker] Pesan dari ${client.id} -> Topik: ${packet.topic}`);
        }
    });
}

startBroker().catch(console.error);

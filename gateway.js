const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PROTO_PATH = path.join(__dirname, 'chillarrival.proto');

const packageDef = protoLoader.loadSync(PROTO_PATH, {});
const chillProto = grpc.loadPackageDefinition(packageDef).chillarrival;

const grpcClient = new chillProto.ChillArrivalService('localhost:50051', grpc.credentials.createInsecure());

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('🔗 Browser Front-end Connected UI:', socket.id);

    // SERVER-INITIATED EVENT: Push data without client request
    const climateStream = grpcClient.streamClimateData({});
    
    climateStream.on('data', (data) => {
        socket.emit('climate_data', data);
    });

    climateStream.on('error', (err) => {
        console.error('gRPC stream error:', err.message);
    });

    // Server-initiated alert periodically
    const alertInterval = setInterval(() => {
        const events = [
            "System check: Servers running optimally.",
            "Security: No breaches detected.",
            "Network: Latency is below 20ms.",
            "Sensors: All bedroom sensors active."
        ];
        const randomEvent = events[Math.floor(Math.random() * events.length)];
        socket.emit('server_alert', { message: randomEvent, timestamp: new Date().toLocaleTimeString() });
    }, 15000);

    // COMMAND & CONTROL BRIDGE
    socket.on('send_command_to_grpc', (payload) => {
        console.log(`[Bridge] Instructions from UI: ${payload.deviceId} -> ${payload.action}`);
        grpcClient.sendCommand({ deviceId: payload.deviceId, action: payload.action }, (err, res) => {
            if (err) {
                socket.emit('command_response', { success: false, error: err.details || err.message });
            } else {
                socket.emit('command_response', { success: true, message: res.message, action: payload.action, device: payload.deviceId });
            }
        });
    });

    // Bi-directional Streaming for Energy Monitoring
    let bidiStream = null;
    
    socket.on('start_energy_sync', () => {
        if (!bidiStream) {
            bidiStream = grpcClient.monitorEnergy();
            bidiStream.on('data', (alert) => {
                // Proto-loader converts snake_case to camelCase automatically
                // So device_id -> deviceId, alert_message -> alertMessage, etc.
                console.log(`[Energy Data] deviceId=${alert.deviceId}, kwh=${alert.energyKwh}, cost=${alert.estimatedCost}`);
                socket.emit('energy_alert', {
                    alertMessage: alert.alertMessage,
                    isCritical: alert.isCritical,
                    energyKwh: alert.energyKwh,
                    estimatedCost: alert.estimatedCost,
                    recommendedAction: alert.recommendedAction,
                    deviceId: alert.deviceId,
                    deviceName: alert.deviceName,
                    runningMinutes: alert.runningMinutes,
                    wattPerHour: alert.wattPerHour,
                    thresholdKwh: alert.thresholdKwh,
                    isSummary: alert.isSummary || false
                });
            });
            bidiStream.on('error', (err) => {
                console.error('Bidi Stream Error:', err.message);
                bidiStream = null;
            });
            bidiStream.write({ deviceId: 'SYSTEM_SYNC', watt: 0 });
            socket.emit('activity_log', `Energy Monitoring Engine Activated`);
        }
    });

    socket.on('stop_energy_sync', () => {
        if (bidiStream) {
            bidiStream.end();
            bidiStream = null;
            socket.emit('activity_log', `Energy Monitoring Engine Stopped`);
        }
    });

    socket.on('disconnect', () => {
        console.log('❌ Browser Client Disconnected:', socket.id);
        climateStream.cancel();
        clearInterval(alertInterval);
        if (bidiStream) {
            bidiStream.end();
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`=== ChillArrival Web Gateway berjalan di http://localhost:${PORT} ===`);
});

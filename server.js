const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const http = require('http');
const packageDef = protoLoader.loadSync("chillarrival.proto", {});
const chillProto = grpc.loadPackageDefinition(packageDef).chillarrival;

const pricePerKwh = 1500; // Tarif listrik IDR/kWh

// === DEVICE SPECS (watt per jam) ===
const deviceSpecs = {
  "AC_BEDROOM": {
    deviceName: "AC Kamar Tidur",
    category: "Pendingin",
    wattPerHour: 1000,
    alertThresholdKwh: 2.0,   // Alert kalau sudah pakai 2 kWh
    note: "AC hemat energi jika digunakan maksimal 2 jam."
  },
  "AC_LIVING": {
    deviceName: "AC Ruang Tamu",
    category: "Pendingin",
    wattPerHour: 1200,
    alertThresholdKwh: 2.5,
    note: "Jangan gunakan saat sedang maintenance."
  },
  "LAMP_KITCHEN": {
    deviceName: "Lampu Dapur",
    category: "Pencahayaan",
    wattPerHour: 40,
    alertThresholdKwh: 0.5,
    note: "Cocok untuk penerangan sementara."
  },
  "DISPENSER": {
    deviceName: "Dispenser Air",
    category: "Peralatan Rumah",
    wattPerHour: 600,
    alertThresholdKwh: 1.0,
    note: "Gunakan hanya saat butuh panas/dingin air."
  }
};

// === RUNTIME STATE ===
const deviceStates = {};        // { "AC_BEDROOM": "ON" | "OFF" }
const deviceTimers = {};        // { "AC_BEDROOM": intervalId }
const deviceAccumulatedKwh = {}; // { "AC_BEDROOM": 0.0234 }
const deviceStartTimes = {};    // { "AC_BEDROOM": Date }
const maintenanceDevices = ["AC_LIVING"];

// All connected bidi streams — so we can push energy updates to all
const activeBidiStreams = new Set();

// Initialize all devices to OFF
Object.keys(deviceSpecs).forEach(id => {
  deviceStates[id] = "OFF";
  deviceAccumulatedKwh[id] = 0;
});

// === HELPER FUNCTIONS ===
function getDeviceSpec(deviceId) {
  return deviceSpecs[deviceId] || null;
}

function broadcastEnergyUpdate(deviceId) {
  const spec = getDeviceSpec(deviceId);
  if (!spec) return;

  const kwh = deviceAccumulatedKwh[deviceId] || 0;
  const cost = Math.round(kwh * pricePerKwh);
  const startTime = deviceStartTimes[deviceId];
  const runningMinutes = startTime ? ((Date.now() - startTime.getTime()) / 60000).toFixed(1) : 0;
  const isOverThreshold = kwh >= spec.alertThresholdKwh;

  let alertMessage = `${spec.deviceName}: ${kwh.toFixed(4)} kWh | Rp${cost.toLocaleString()} | ${runningMinutes} menit aktif`;
  let recommendedAction = "Pantau penggunaan dan matikan bila tidak diperlukan.";
  let isCritical = false;

  if (isOverThreshold) {
    isCritical = true;
    alertMessage = `⚠️ BATAS TERCAPAI! ${spec.deviceName} sudah pakai ${kwh.toFixed(4)} kWh (batas: ${spec.alertThresholdKwh} kWh). Estimasi Rp${cost.toLocaleString()}. SEGERA MATIKAN!`;
    recommendedAction = `Segera matikan ${spec.deviceName}! Biaya sudah Rp${cost.toLocaleString()}.`;
  }

  const payload = {
    alertMessage,
    isCritical,
    energyKwh: parseFloat(kwh.toFixed(4)),
    estimatedCost: cost,
    recommendedAction,
    // Extra fields for the gateway to use (proto will ignore unknown fields gracefully)
    deviceId: deviceId,
    deviceName: spec.deviceName,
    runningMinutes: parseFloat(runningMinutes),
    wattPerHour: spec.wattPerHour,
    thresholdKwh: spec.alertThresholdKwh
  };

  console.log(`[Energy] ${deviceId} | ${kwh.toFixed(4)} kWh | Rp${cost} | ${runningMinutes}m${isCritical ? ' ⚠️ OVER THRESHOLD' : ''}`);

  // Push to all connected bidi streams
  activeBidiStreams.forEach(stream => {
    try {
      stream.write(payload);
    } catch (e) {
      // Stream closed, will be cleaned up
    }
  });
}

function startEnergyTracking(deviceId) {
  const spec = getDeviceSpec(deviceId);
  if (!spec) return;

  // Reset accumulator
  deviceAccumulatedKwh[deviceId] = 0;
  deviceStartTimes[deviceId] = new Date();

  // Calculate kWh increment per second: wattPerHour / 3600 / 1000
  const kwhPerSecond = spec.wattPerHour / 3600 / 1000;

  // Update every 2 seconds
  deviceTimers[deviceId] = setInterval(() => {
    if (deviceStates[deviceId] === "ON") {
      deviceAccumulatedKwh[deviceId] += kwhPerSecond * 2; // 2 seconds interval
      broadcastEnergyUpdate(deviceId);
    }
  }, 2000);

  console.log(`[Tracker] Started tracking ${deviceId} (${spec.wattPerHour}W)`);
}

function stopEnergyTracking(deviceId) {
  if (deviceTimers[deviceId]) {
    clearInterval(deviceTimers[deviceId]);
    delete deviceTimers[deviceId];
  }

  const spec = getDeviceSpec(deviceId);
  const kwh = deviceAccumulatedKwh[deviceId] || 0;
  const cost = Math.round(kwh * pricePerKwh);
  const startTime = deviceStartTimes[deviceId];
  const runningMinutes = startTime ? ((Date.now() - startTime.getTime()) / 60000).toFixed(1) : 0;

  console.log(`[Tracker] Stopped ${deviceId} | Total: ${kwh.toFixed(4)} kWh | Rp${cost} | ${runningMinutes}m`);

  // Send final summary
  const payload = {
    alertMessage: `📊 RINGKASAN: ${spec ? spec.deviceName : deviceId} dimatikan. Total pemakaian: ${kwh.toFixed(4)} kWh selama ${runningMinutes} menit. Estimasi biaya: Rp${cost.toLocaleString()}`,
    isCritical: false,
    energyKwh: parseFloat(kwh.toFixed(4)),
    estimatedCost: cost,
    recommendedAction: `Pemakaian selesai. Total biaya Rp${cost.toLocaleString()}.`,
    deviceId: deviceId,
    deviceName: spec ? spec.deviceName : deviceId,
    runningMinutes: parseFloat(runningMinutes),
    wattPerHour: spec ? spec.wattPerHour : 0,
    thresholdKwh: spec ? spec.alertThresholdKwh : 0,
    isSummary: true
  };

  activeBidiStreams.forEach(stream => {
    try { stream.write(payload); } catch (e) {}
  });

  // Reset
  deviceAccumulatedKwh[deviceId] = 0;
  delete deviceStartTimes[deviceId];
}

// === gRPC SERVER ===
const server = new grpc.Server();

server.addService(chillProto.ChillArrivalService.service, {
  // 1. Unary: Command & Control
  sendCommand: (call, callback) => {
    const { deviceId, action } = call.request;
    console.log(`[Unary] Request: ${deviceId} -> ${action}`);

    if (maintenanceDevices.includes(deviceId)) {
      return callback({
        code: grpc.status.FAILED_PRECONDITION,
        details: `Perintah Ditolak: ${deviceId} dalam masa Maintenance!`
      });
    }

    const prevState = deviceStates[deviceId];
    deviceStates[deviceId] = action;

    // Start/stop energy tracking based on action
    if (action === "ON" && prevState !== "ON") {
      startEnergyTracking(deviceId);
    } else if (action === "OFF" && prevState === "ON") {
      stopEnergyTracking(deviceId);
    }

    callback(null, { success: true, message: `Berhasil! ${deviceId} sekarang ${action}` });
  },

  // 2. Server Streaming: Live Climate Feed
  streamClimateData: (call) => {
    console.log("[Streaming] Client terhubung ke Live Climate Feed.");
    const interval = setInterval(() => {
      const temp = (Math.random() * (35 - 25) + 25).toFixed(1);
      call.write({
        temperature: parseFloat(temp),
        location: "Ruang Tamu",
        timestamp: new Date().toLocaleTimeString()
      });
    }, 2000);

    call.on('cancelled', () => clearInterval(interval));
  },

  // 3. Bi-directional Streaming: Real-time Energy Monitor
  monitorEnergy: (call) => {
    console.log("[Bidi] Energy stream connected.");

    // Register this stream for broadcasts
    activeBidiStreams.add(call);

    // Send initial state of all active devices
    Object.keys(deviceStates).forEach(deviceId => {
      if (deviceStates[deviceId] === "ON") {
        broadcastEnergyUpdate(deviceId);
      }
    });

    call.on('data', (data) => {
      // Client can also send manual energy data if needed
      const deviceId = data.deviceId || data.device_id;
      if (deviceId && deviceId !== 'SYSTEM_SYNC') {
        console.log(`[Bidi] Manual data from client: ${deviceId} ${data.watt}W`);
      }
    });

    call.on('end', () => {
      activeBidiStreams.delete(call);
      call.end();
    });

    call.on('error', () => {
      activeBidiStreams.delete(call);
    });
  },

  // 4. Unary: Device Info
  getDeviceInfo: (call, callback) => {
    const { deviceId } = call.request;
    const spec = getDeviceSpec(deviceId);

    if (!spec) {
      return callback(null, {
        deviceId: deviceId,
        deviceName: "Tidak terdaftar",
        category: "Unknown",
        wattPerHour: 0,
        wattPerMinute: 0,
        defaultDurationMinutes: 0,
        note: "Device belum terdaftar."
      });
    }

    callback(null, {
      deviceId: deviceId,
      deviceName: spec.deviceName,
      category: spec.category,
      wattPerHour: spec.wattPerHour,
      wattPerMinute: spec.wattPerHour / 60,
      defaultDurationMinutes: 60,
      note: spec.note
    });
  }
});

// === API to get all device states (for gateway) ===
const statusPort = 3001;
let activeGrpcPort = 50051;

server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), (err, port) => {
  if (err) {
    console.error('Bind error:', err);
    return;
  }
  activeGrpcPort = port;
  console.log(`=== ChillArrival Core Hub (Node.js) Jalan di Port ${port} ===`);

  const httpServer = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.url === '/' || req.url === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        service: 'ChillArrival Core Hub',
        grpcPort: activeGrpcPort,
        status: 'running',
        devices: deviceStates,
        energy: deviceAccumulatedKwh,
        maintenanceDevices,
        timestamp: new Date().toISOString()
      }, null, 2));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  httpServer.listen(statusPort, () => {
    console.log(`=== HTTP status endpoint siap di http://localhost:${statusPort}/status ===`);
  });
});

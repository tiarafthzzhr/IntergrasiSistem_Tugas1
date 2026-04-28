const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const http = require('http');
const packageDef = protoLoader.loadSync("chillarrival.proto", {});
const chillProto = grpc.loadPackageDefinition(packageDef).chillarrival;

const pricePerKwh = 1500; // Estimasi tarif listrik (IDR/kWh)
const deviceStates = { "AC_LIVING": "OFF", "LAMP_KITCHEN": "OFF" };
const maintenanceDevices = ["AC_LIVING"]; // Simulasi device dalam maintenance

const deviceSpecs = {
  "AC_BEDROOM": {
    deviceName: "AC Kamar Tidur",
    category: "Pendingin",
    wattPerHour: 1000,
    wattPerMinute: 1000 / 60,
    defaultDurationMinutes: 60,
    note: "AC hemat energi jika digunakan maksimal 2 jam dalam satu sesi."
  },
  "AC_LIVING": {
    deviceName: "AC Ruang Tamu",
    category: "Pendingin",
    wattPerHour: 1200,
    wattPerMinute: 1200 / 60,
    defaultDurationMinutes: 60,
    note: "Jangan gunakan saat sedang maintenance."
  },
  "LAMP_KITCHEN": {
    deviceName: "Lampu Dapur",
    category: "Pencahayaan",
    wattPerHour: 40,
    wattPerMinute: 40 / 60,
    defaultDurationMinutes: 180,
    note: "Cocok untuk penerangan sementara."
  },
  "DISPENSER": {
    deviceName: "Dispenser Air",
    category: "Peralatan Rumah",
    wattPerHour: 600,
    wattPerMinute: 600 / 60,
    defaultDurationMinutes: 30,
    note: "Gunakan hanya saat butuh panas/dingin air."
  }
};

function getDeviceSpec(deviceId) {
  return deviceSpecs[deviceId] || null;
}

function calculateEnergy(kWatt, durationMinutes) {
  return parseFloat(((kWatt * durationMinutes) / 60 / 1000).toFixed(4));
}

function estimateCost(energyKwh) {
  return parseFloat((energyKwh * pricePerKwh).toFixed(0));
}

const server = new grpc.Server();

server.addService(chillProto.ChillArrivalService.service, {
  sendCommand: (call, callback) => {
    const { deviceId, action } = call.request;
    console.log(`[Unary] Request: ${deviceId} -> ${action}`);

    if (maintenanceDevices.includes(deviceId)) {
      return callback({
        code: grpc.status.FAILED_PRECONDITION,
        details: `Perintah Ditolak: ${deviceId} dalam masa Maintenance!`
      });
    }

    deviceStates[deviceId] = action;
    callback(null, { success: true, message: `Berhasil! ${deviceId} sekarang ${action}` });
  },

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

  monitorEnergy: (call) => {
    console.log("[Bidi] Monitoring Energi dimulai.");

    call.on('data', (data) => {
      const deviceId = data.deviceId || data.device_id;
      const providedWatt = Number(data.watt || 0);
      const durationMinutes = Number(data.duration_minutes || data.durationMinutes || 0);
      const spec = getDeviceSpec(deviceId);

      const watt = providedWatt || (spec ? spec.wattPerHour : 0);
      const duration = durationMinutes || (spec ? spec.defaultDurationMinutes : 60);
      const energyKwh = calculateEnergy(watt, duration);
      const estimatedCost = estimateCost(energyKwh);

      console.log(`[Log] ${deviceId} | ${watt}W | ${duration} menit -> ${energyKwh} kWh | Rp${estimatedCost}`);

      let alertMessage = `Laporan ${deviceId}: ${energyKwh.toFixed(4)} kWh, estimasi biaya Rp${estimatedCost}.`;
      let recommendedAction = "Pantau penggunaan dan matikan bila tidak diperlukan.";
      let isCritical = false;

      if (!spec) {
        isCritical = true;
        alertMessage = `Device tidak terdaftar: ${deviceId}. Pastikan watt dan durasi terisi dengan benar.`;
        recommendedAction = "Tambahkan metadata device atau periksa input energi.";
      } else if (watt > 1200 || duration > 120 || energyKwh > 1) {
        isCritical = true;
        alertMessage = `PERINGATAN: ${spec.deviceName} menggunakan ${energyKwh.toFixed(4)} kWh selama ${duration} menit.`;
        recommendedAction = `Kurangi durasi penggunaan ${spec.deviceName} atau aktifkan mode hemat.`;
      }

      call.write({
        alertMessage,
        isCritical,
        energyKwh,
        estimatedCost,
        recommendedAction
      });
    });

    call.on('end', () => call.end());
  },

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
        note: "Device belum terdaftar. Pastikan device ID benar."
      });
    }

    callback(null, {
      deviceId: deviceId,
      deviceName: spec.deviceName,
      category: spec.category,
      wattPerHour: spec.wattPerHour,
      wattPerMinute: spec.wattPerMinute,
      defaultDurationMinutes: spec.defaultDurationMinutes,
      note: spec.note
    });
  }
});

const statusPort = 3000;
let activeGrpcPort = 50051;

server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), (err, port) => {
  if (err) {
    console.error('Bind error:', err);
    return;
  }
  activeGrpcPort = port;
  server.start();
  console.log(`=== ChillArrival Core Hub (Node.js) Jalan di Port ${port} ===`);

  const httpServer = http.createServer((req, res) => {
    if (req.url !== '/' && req.url !== '/status') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found', path: req.url }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      service: 'ChillArrival Core Hub',
      grpcPort: activeGrpcPort,
      status: 'running',
      devices: deviceStates,
      maintenanceDevices,
      timestamp: new Date().toISOString()
    }, null, 2));
  });

  httpServer.listen(statusPort, () => {
    console.log(`=== HTTP status endpoint siap di http://localhost:${statusPort}/status ===`);
  });
});

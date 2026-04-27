const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const packageDef = protoLoader.loadSync("chillarrival.proto", {});
const chillProto = grpc.loadPackageDefinition(packageDef).chillarrival;

// State Management In-Memory
const deviceStates = { "AC_BEDROOM": "OFF", "AC_LIVING": "OFF", "LAMP_KITCHEN": "OFF" };
const maintenanceDevices = ["AC_LIVING"]; // Simulasi AC sedang rusak

// Daya tiap alat (Watt)
const devicePowerRatings = {
  "AC_BEDROOM": 850,
  "AC_LIVING": 1200,
  "LAMP_KITCHEN": 40
};

let totalEnergyWatt = 0;

const server = new grpc.Server();

server.addService(chillProto.ChillArrivalService.service, {
  // 1. Implementasi Unary 
  sendCommand: (call, callback) => {
    const deviceId = call.request.deviceId || call.request.device_id;
    const action = call.request.action;
    console.log(`[Unary] Request: ${deviceId} -> ${action}`);

    // Error Handling: Safety Protocol 
    if (maintenanceDevices.includes(deviceId)) {
      return callback({
        code: grpc.status.FAILED_PRECONDITION,
        details: `Perintah Ditolak: ${deviceId} dalam masa Maintenance!`
      });
    }

    deviceStates[deviceId] = action;
    callback(null, { success: true, message: `Berhasil! ${deviceId} sekarang ${action}` });
  },

  // 2. Implementasi Server Streaming (Live Climate Feed)
  streamClimateData: (call) => {
    console.log("[Streaming] Client terhubung ke Live Climate Feed.");
    const interval = setInterval(() => {
      const temp = (Math.random() * (26 - 18) + 18).toFixed(1); // Suhu kamar yg lebih dingin
      call.write({
        temperature: parseFloat(temp),
        location: "Kamar Tidur",
        timestamp: new Date().toLocaleTimeString()
      });
    }, 2000);

    call.on('cancelled', () => clearInterval(interval));
  },

  // 3. Bi-directional Streaming (Eco-Analytics)
  monitorEnergy: (call) => {
    console.log("[Bidi] Sistem Energi Otomatis (Auto-Calculate) aktif.");
    
    // Server otomatis menghitung beban setiap detik berdasarkan deviceStates
    const interval = setInterval(() => {
      // Beban diam (Standby) rumah seperti Kulkas & Perangkat Pasif = 150W
      let currentActiveWatt = 150; 
      
      for (const dev in deviceStates) {
        if (deviceStates[dev] === "ON") {
          currentActiveWatt += devicePowerRatings[dev] || 0;
        }
      }
      
      // Akumulasikan energi (Simulasi dipercepat: Anggap pembacaan periodik menambah total daya konsumsi)
      totalEnergyWatt += currentActiveWatt;
      
      let critical = currentActiveWatt > 1000;
      let alertMsg = critical
        ? `🔥 OVERLOAD! Beban listrik rumah sangat boros: ${currentActiveWatt}W!`
        : `⚡ Efisien. Beban daya aktif saat ini: ${currentActiveWatt}W.`;

      // Kirim hasil hitungan ke klien via Bidi stream
      call.write({
        alertMessage: alertMsg,
        isCritical: critical,
        totalWattUsed: totalEnergyWatt
      });
    }, 2000); // dihitung tiap 2 detik

    call.on('data', (data) => {
      console.log(`[Log] Ping Sinkronisasi diterima dari Front-End.`);
    });

    call.on('end', () => {
      clearInterval(interval);
      call.end();
    });
    call.on('cancelled', () => {
      clearInterval(interval);
    });
  }
});

server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
  console.log("=== ChillArrival Core Hub (Node.js) Jalan di Port 50051 ===");
});
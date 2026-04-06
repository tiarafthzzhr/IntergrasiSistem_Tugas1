const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const packageDef = protoLoader.loadSync("chillarrival.proto", {});
const chillProto = grpc.loadPackageDefinition(packageDef).chillarrival;

// State Management In-Memory
const deviceStates = { "AC_LIVING": "OFF", "LAMP_KITCHEN": "OFF" };
const maintenanceDevices = ["AC_LIVING"]; // Simulasi AC sedang rusak

const server = new grpc.Server();

server.addService(chillProto.ChillArrivalService.service, {
  // 1. Implementasi Unary 
  sendCommand: (call, callback) => {
    const { deviceId, action } = call.request;
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
    console.log("[Bidi] Monitoring Energi dimulai.");
    call.on('data', (data) => {
      console.log(`[Log] Listrik ${data.deviceId}: ${data.watt}W`);
      if (data.watt > 1000) {
        call.write({ alertMessage: `BOROS! Matikan ${data.deviceId} sekarang!`, isCritical: true });
      }
    });
    call.on('end', () => call.end());
  }
});

server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
  console.log("=== ChillArrival Core Hub (Node.js) Jalan di Port 50051 ===");
});
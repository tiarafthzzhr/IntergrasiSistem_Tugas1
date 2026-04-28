const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const packageDef = protoLoader.loadSync("chillarrival.proto", {});
const chillProto = grpc.loadPackageDefinition(packageDef).chillarrival;

const client = new chillProto.ChillArrivalService('localhost:50051', grpc.credentials.createInsecure());

// --- UNARY (Request-Response) ---
console.log("\n--- UNARY RPC ---");
client.sendCommand({ deviceId: "LAMP_KITCHEN", action: "ON" }, (err, res) => {
  if (err) {
    console.error("Safety Protocol (Error):", err.details);
  } else {
    console.log("Server Response:", res.message);
  }
});

setTimeout(() => {
  console.log("\n--- DEVICE INFO ---");
  client.getDeviceInfo({ deviceId: "AC_BEDROOM" }, (err, info) => {
    if (err) {
      console.error("GetDeviceInfo Error:", err.details || err.message);
      return;
    }
    const deviceName = info.deviceName || info.device_name;
    const wattPerHour = info.wattPerHour || info.watt_per_hour;
    const defaultDuration = info.defaultDurationMinutes || info.default_duration_minutes;
    console.log(`Device Info: ${deviceName} (${info.category}) - Watt/jam: ${wattPerHour}, Durasi default: ${defaultDuration} menit`);
  });
}, 500);

// --- SERVER STREAMING (Live Suhu) ---
setTimeout(() => {
  console.log("\n--- SERVER STREAMING (LIVE CLIMATE) ---");
  const stream = client.streamClimateData({});
  let count = 0;

  stream.on('data', (data) => {
    console.log(`[STREAM] Suhu: ${data.temperature.toFixed(1)}°C | ${data.location} | ${data.timestamp}`);
    count++;
    if (count >= 4) {
      console.log("Stopping stream after 4 updates...");
      stream.cancel();
    }
  });

  stream.on('error', (err) => {
    if (err.code === grpc.status.CANCELLED) {
      console.log("Stream successfully closed by client.");
    } else {
      console.error("Stream Error:", err.message);
    }
  });
}, 1000);

// --- BI-DIRECTIONAL (Eco-Analytics) ---
setTimeout(() => {
  console.log("\n--- BI-DIRECTIONAL STREAMING (ENERGY) ---");
  const bidi = client.monitorEnergy();

  bidi.on('data', (alert) => {
    console.log(`\x1b[33m[ENERGY ALERT]\x1b[0m ${alert.alertMessage || alert.alert_message}`);
    const critical = alert.isCritical ?? alert.is_critical;
    const energyValue = alert.energyKwh ?? alert.energy_kwh ?? 0;
    const costValue = alert.estimatedCost ?? alert.estimated_cost ?? 0;
    const actionValue = alert.recommendedAction || alert.recommended_action || "-";
    console.log(`  - Critical: ${critical}`);
    console.log(`  - Total Energy: ${energyValue.toFixed(4)} kWh`);
    console.log(`  - Estimated Cost: Rp${costValue}`);
    console.log(`  - Rekomendasi: ${actionValue}`);
  });

  bidi.on('error', (err) => console.log("Bidi Error:", err.message));
  bidi.on('end', () => console.log("Streaming Energy Selesai."));

  const reports = [
    { deviceId: "AC_BEDROOM", watt: 850, duration_minutes: 90 },
    { deviceId: "AC_BEDROOM", watt: 1150, duration_minutes: 120 },
    { deviceId: "DISPENSER", watt: 600, duration_minutes: 30 }
  ];

  console.log("Mengirim laporan penggunaan daya ke server...");
  reports.forEach((data, index) => {
    setTimeout(() => {
      console.log(`[CLIENT SEND] ${data.deviceId} - ${data.watt}W selama ${data.duration_minutes} menit`);
      bidi.write(data);
      if (index === reports.length - 1) {
        setTimeout(() => bidi.end(), 1000);
      }
    }, index * 1800);
  });
}, 10000);
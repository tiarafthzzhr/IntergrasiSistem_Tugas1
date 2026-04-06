const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const packageDef = protoLoader.loadSync("chillarrival.proto", {});
const chillProto = grpc.loadPackageDefinition(packageDef).chillarrival;

const client = new chillProto.ChillArrivalService('localhost:50051', grpc.credentials.createInsecure());

// --- UNARY (Request-Response) ---
console.log("\n--- UNARY RPC ---");
// parameter sesuai dengan message CommandRequest di proto
client.sendCommand({ deviceId: "AC_BEDROOM", action: "ON" }, (err, res) => {
  if (err) {
    console.error("Safety Protocol (Error):", err.details);
  } else {
    console.log("Server Response:", res.message);
  }
});

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

  // Handler error supaya tidak crash saat dicancel
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

  // Mendengarkan respon/alert dari server
  bidi.on('data', (alert) => {
    console.log(`\x1b[31m[ALERT DITERIMA]\x1b[0m ${alert.alertMessage}`); // Teks merah untuk alert
  });

  bidi.on('error', (err) => console.log("Bidi Error:", err.message));
  bidi.on('end', () => console.log("Streaming Energy Selesai."));

  // Data yang akan dikirim
  const reports = [
    { deviceId: "AC_BEDROOM", watt: 450 },
    { deviceId: "AC_BEDROOM", watt: 1150 }, // Ini akan memicu alert
    { deviceId: "PC_GAMING", watt: 600 }
  ];

  console.log("Mengirim laporan penggunaan daya ke server...");
  
  reports.forEach((data, index) => {
    // Delay sedikit antar pengiriman agar log tidak menumpuk instan
    setTimeout(() => {
      console.log(`[CLIENT SEND] Mengirim data: ${data.deviceId} - Penggunaan: ${data.watt}W`);
      bidi.write(data);
      
      // Jika sudah data terakhir, tutup stream
      if (index === reports.length - 1) {
        setTimeout(() => bidi.end(), 1000);
      }
    }, index * 1500); 
  });

}, 10000);
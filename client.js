const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const packageDef = protoLoader.loadSync("chillarrival.proto", {});
const chillProto = grpc.loadPackageDefinition(packageDef).chillarrival;

const client = new chillProto.ChillArrivalService('localhost:50051', grpc.credentials.createInsecure());

// --- UNARY (Request-Response) ---
console.log("\n--- UNARY RPC ---");
// parameter sesuai dengan message CommandRequest di proto
client.sendCommand({ device_id: "LAMP_KITCHEN", action: "ON" }, (err, res) => {
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

  bidi.on('data', (alert) => {
    console.log(">>> NOTIFIKASI:", alert.alert_message);
  });

  bidi.on('error', (err) => console.log("Bidi Error:", err.message));

  console.log("Sending power usage data...");
  bidi.write({ device_id: "AC_BEDROOM", watt: 450 });
  bidi.write({ device_id: "AC_BEDROOM", watt: 1150 }); // Memicu alert
  bidi.end();
}, 10000);
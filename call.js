const { spawn } = require("child_process");
const path = require("path");

function analyzeImage(imagePath) {
  return new Promise((resolve, reject) => {
    const py = spawn("python", [path.join(process.cwd(), "python", "chatbot.py"), imagePath]);

    let dataBuffer = "";
    py.stdout.on("data", (data) => {
      dataBuffer += data.toString();
    });

    py.stderr.on("data", (err) => {
      console.error("Python Error:", err.toString());
      reject(err.toString());
    });

    py.on("close", () => {
      try {
        resolve(JSON.parse(dataBuffer));
      } catch (e) {
        reject("Invalid JSON from Python: " + dataBuffer);
      }
    });
  });
}

module.exports = { analyzeImage };

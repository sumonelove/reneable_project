let logs = JSON.parse(localStorage.getItem("logs") || "[]");
const tableBody = document.querySelector("#dataTable tbody");
const theoryV = +document.getElementById("f_theoryV").value;
const theoryI = +document.getElementById("f_theoryI").value;

let powerChart, efficiencyChart, customChart;

// Load existing logs
logs.forEach(addRow);
updateGraph();

document.getElementById("logForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const voltage = +document.getElementById("voltage").value;
  const current = +document.getElementById("current").value;
  const power = +(voltage * current).toFixed(2);

  const irradiance = +document.getElementById("irradiance").value;
  const area = +document.getElementById("area").value;
  const rating = +document.getElementById("rating").value;

  const inputPower = irradiance * area;
  const efficiency = inputPower > 0 ? +((power / inputPower) * 100).toFixed(2) : 0;

  const log = {
    time: new Date().toLocaleTimeString(),
    voltage,
    current,
    power,
    efficiency,
    rating,
    irradiance,
    panelTemp: document.getElementById("panelTemp").value,
    ambientTemp: document.getElementById("ambientTemp").value
  };

  logs.push(log);
  localStorage.setItem("logs", JSON.stringify(logs));
  addRow(log);
  updateGraph();
  e.target.reset();
});

function addRow(log) {
  const row = tableBody.insertRow();
  row.innerHTML = `
    <td>${log.time}</td>
    <td>${log.voltage}</td>
    <td>${log.current}</td>
    <td>${log.power}</td>
    <td>${log.efficiency}</td>
    <td>${log.rating}</td>
    <td>${log.irradiance}</td>
    <td>${log.panelTemp}</td>
    <td>${log.ambientTemp}</td>
  `;
}

function updateGraph() {
  const times = logs.map(l => l.time);
  const powers = logs.map(l => l.power);
  const effs = logs.map(l => Number(l.efficiency));

  if (powerChart) powerChart.destroy();
  if (efficiencyChart) efficiencyChart.destroy();

  const powerCtx = document.getElementById("powerGraph").getContext("2d");
  const effCtx = document.getElementById("efficiencyGraph").getContext("2d");

  powerChart = new Chart(powerCtx, {
    type: "line",
    data: {
      labels: times,
      datasets: [{
        label: "Power (W)",
        data: powers,
        borderColor: "orange",
        fill: false,
        tension: 0.3
      }]
    },
    options: { responsive: true }
  });

  efficiencyChart = new Chart(effCtx, {
    type: "line",
    data: {
      labels: times,
      datasets: [{
        label: "Efficiency (%)",
        data: effs,
        borderColor: "green",
        fill: false,
        tension: 0.3
      }]
    },
    options: { responsive: true }
  });
}

function plotCustomGraph() {
  const xKey = document.getElementById("xAxisSelect").value;
  const yKey = document.getElementById("yAxisSelect").value;

  const xValues = logs.map(l => +l[xKey]);
  const yValues = logs.map(l => +l[yKey]);

  if (customChart) customChart.destroy();

  const customCtx = document.getElementById("customGraph").getContext("2d");

  customChart = new Chart(customCtx, {
    type: "scatter",
    data: {
      datasets: [{
        label: `${capitalize(yKey)} vs ${capitalize(xKey)}`,
        data: xValues.map((x, i) => ({ x, y: yValues[i] })),
        borderColor: "#00796b",
        backgroundColor: "#4db6ac",
        showLine: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: { title: { display: true, text: capitalize(xKey) } },
        y: { title: { display: true, text: capitalize(yKey) } }
      }
    }
  });
}

function capitalize(key) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
}

function clearData() {
  if (confirm("Are you sure you want to delete all entries?")) {
    localStorage.removeItem("logs");
    logs = [];
    tableBody.innerHTML = "";
    if (powerChart) powerChart.destroy();
    if (efficiencyChart) efficiencyChart.destroy();
    if (customChart) customChart.destroy();
  }
}

function exportToPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.text("Solar Panel Data Log Report", 14, 15);

  const headers = [["Time", "Voltage (V)", "Current (A)", "Power (W)", "Efficiency (%)", "Rating (W)", "Irradiance", "Panel Temp", "Ambient Temp"]];
  const rows = logs.map(l => [
    l.time, l.voltage, l.current, l.power, l.efficiency, l.rating, l.irradiance, l.panelTemp, l.ambientTemp
  ]);

  doc.autoTable({
    head: headers,
    body: rows,
    startY: 25,
    styles: {
      fontSize: 9,
      cellPadding: 2
    },
    headStyles: {
      fillColor: [22, 160, 133]
    },
    margin: { left: 10, right: 10 }
  });

  doc.save("solar_logs_table.pdf");
}

 // Fault analysis
document.getElementById("faultForm").addEventListener("submit", function (e) {
  e.preventDefault();

  // Measured inputs
  const V = +document.getElementById("f_voltage").value;
  const I = +document.getElementById("f_current").value;
  const irradiance = +document.getElementById("f_irradiance").value;
  const area = +document.getElementById("f_area").value;
  const panelTemp = +document.getElementById("f_panelTemp").value;
  const ambientTemp = +document.getElementById("f_ambientTemp").value;
  const shading = document.getElementById("f_shading").value;
  const mismatch = document.getElementById("f_mismatch").value;
  const cable = document.getElementById("f_cable").value;

  // Rated inputs
  const theoryV = +document.getElementById("f_theoryV").value;
  const theoryI = +document.getElementById("f_theoryI").value;
  const rating = +document.getElementById("f_rating").value;

  const power = +(V * I).toFixed(2);
  const expectedInputPower = +(irradiance * area).toFixed(2);
  const expectedPower = +(theoryV * theoryI).toFixed(2);
  const efficiency = expectedInputPower > 0 ? +(power / expectedInputPower * 100).toFixed(2) : 0;

  const faults = [];

  // Voltage analysis
  if (V === 0 && I > 0) {
    faults.push(["Short Circuit", "Voltage = 0 with current flowing — potential wiring fault or diode failure."]);
  } else if (I === 0 && V > 0) {
    faults.push(["Open Circuit", "Voltage present but no current — likely a disconnected wire or break."]);
  } else {
    if (V < 0.85 * theoryV) {
      faults.push(["Low Voltage", `Measured voltage (${V}V) is significantly below rated (${theoryV}V).`]);
    } else if (V > 1.1 * theoryV) {
      faults.push(["High Voltage", `Measured voltage (${V}V) exceeds expected max (${theoryV}V). Possible config error.`]);
    }
  }

  // Current analysis
  if (I < 0.85 * theoryI) {
    faults.push(["Low Current", `Measured current (${I}A) is lower than expected (${theoryI}A). Check shading, soiling.`]);
  } else if (I > 1.1 * theoryI) {
    faults.push(["High Current", `Current (${I}A) exceeds panel spec (${theoryI}A). Sensor or circuit may be faulty.`]);
  }

  // Irradiance
  if (irradiance < 300) {
    faults.push(["Low Irradiance", "Sunlight is insufficient. Expect low output."]);
  }

  // Power underperformance
  if (power < 0.8 * rating && irradiance >= 600) {
    faults.push(["Underperformance", `Output power (${power}W) well below rated (${rating}W) under good sunlight.`]);
  }

  // Efficiency check
  if (efficiency < 5 && irradiance >= 600) {
    faults.push(["Low Efficiency", `Efficiency is just ${efficiency}%. Heat or dirt may be affecting performance.`]);
  }

  // Temperature-related faults
  if (panelTemp > 65) {
    faults.push(["High Panel Temperature", "Excessive heat leads to performance drop. Consider cleaning or shade analysis."]);
  }

  if (panelTemp - ambientTemp > 25) {
    faults.push(["Hot Spot Risk", "Local overheating detected. Possible mismatch or cracked cells."]);
  }

  // User inputs: shading, mismatch, cable
  if (shading === "partial") {
    faults.push(["Partial Shading", "Causes mismatch and current imbalance. Clean or reposition panel."]);
  } else if (shading === "full") {
    faults.push(["Full Shading", "Complete blockage — clear obstructions."]);
  }

  if (mismatch === "yes") {
    faults.push(["Panel Mismatch", "Different panel ratings or ages may reduce efficiency."]);
  }

  if (cable === "loose") {
    faults.push(["Loose Cable", "Unstable connections can cause voltage drop. Check terminals."]);
  } else if (cable === "damaged") {
    faults.push(["Damaged Cable", "May cause safety hazards and output loss. Inspect thoroughly."]);
  }

  // Output result
  const result = document.getElementById("faultResult");
  let html = `<h3>📋 Fault Analysis Result</h3>
              <p><strong>Measured Power:</strong> ${power} W</p>
              <p><strong>Efficiency:</strong> ${efficiency.toFixed(2)} %</p>`;

  if (faults.length === 0) {
    html += `<p style="color: green; font-weight: bold;">✅ No major faults detected. Panel is operating normally.</p>`;
  } else {
    html += `<p style="color: red; font-weight: bold;">⚠️ ${faults.length} Fault(s) Detected:</p><ul>`;
    faults.forEach(([type, detail]) => {
      html += `<li><strong>${type}:</strong> ${detail}</li>`;
    });
    html += `</ul>`;
  }

  result.innerHTML = html;
});
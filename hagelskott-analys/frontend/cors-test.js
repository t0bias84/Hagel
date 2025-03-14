import fetch from "node-fetch";

const url = "http://localhost:8000/api/analysis/results/676f2ac...";

async function testCors() {
  try {
    // Notera att vi sätter en "Origin"-header för att simulera att
    // förfrågan kommer från en annan domän.
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Origin: "http://localhost:5173",
      },
    });

    // Kolla om server svarar med CORS-headers
    console.log("Status:", response.status);
    console.log("Headers:", Object.fromEntries(response.headers.entries()));

    const text = await response.text();
    console.log("Body:", text);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

testCors();
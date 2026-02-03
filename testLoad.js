const axios = require("axios");

const url = "http://localhost:3000/fetch-external-shipment-data";
const payload ={
  CompanyId: "66",
  ConfigId: "6",
  DbName: "EBS1213",
  procedureName: "xxflxi_label_fetch_module_data",
  parameters: {
    p_module: "orders",
    p_key: ""
  }
}

const concurrentRequests = 20;

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function runTest() {
  console.time("TestDuration");
  const requests = [];
  for (let i = 0; i < concurrentRequests; i++) {
    requests.push(
      delay(i * 20).then(() =>
        axios.post(url, payload)
          .then(res => console.log(`✅ Success [${i + 1}] - ${res.status}`))
          .catch(err => console.log(`❌ Error [${i + 1}]:`, err.message))
      )
    );
  }
  await Promise.all(requests);
  console.timeEnd("TestDuration");
}


runTest();

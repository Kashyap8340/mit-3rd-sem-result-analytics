import { fetchStudentResult } from "./src/app/actions";

async function testFallback() {
    console.log("Testing CSE (Expect sem '2' to work)");
    const cse = await fetchStudentResult("24105107001", "2025", ["2", "II"], "November/2025");
    console.log(cse ? `Success! Name: ${cse.name}, SGPA: ${cse.sgpa}` : "Failed CSE");

    console.log("\nTesting IT (Expect sem 'II' to work via fallback)");
    const it = await fetchStudentResult("24106107022", "2025", ["2", "II"], "November/2025");
    console.log(it ? `Success! Name: ${it.name}, SGPA: ${it.sgpa}` : "Failed IT");
}

testFallback();

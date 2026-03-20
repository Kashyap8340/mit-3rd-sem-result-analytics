import { generateRegistrationNumbers } from "./lib/utils";

const regNos = generateRegistrationNumbers("101", 5, "24"); // Civil, 5 regular + 20 lateral
console.log("Total generated:", regNos.length);
console.log("First 5:", regNos.slice(0, 5));
console.log("Last 5:", regNos.slice(-5));

const lateral = regNos.filter(r => r.includes("1079")); // Check for 9xx series
console.log("Lateral Entry Count:", lateral.length);
console.log("Lateral Entry Sample:", lateral.slice(0, 3));

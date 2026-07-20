// Helper function to convert name/surname to Turkish uppercase
function toTurkishUpperCase(str) {
  if (!str) return "";
  return str
    .trim()
    .replace(/i/g, "İ")
    .replace(/ı/g, "I")
    .replace(/ğ/g, "Ğ")
    .replace(/ü/g, "Ü")
    .replace(/ş/g, "Ş")
    .replace(/ö/g, "Ö")
    .replace(/ç/g, "Ç")
    .toLocaleUpperCase("tr-TR");
}

async function test() {
  const tcNo = "20119881932";
  const fullName = "HAKAN VARLIK";
  const birthYear = 1976;

  const nameParts = fullName.trim().split(/\s+/);
  const soyad = toTurkishUpperCase(nameParts.pop() || "");
  const ad = toTurkishUpperCase(nameParts.join(" "));

  console.log("Request details:");
  console.log("TC:", tcNo);
  console.log("Ad:", ad);
  console.log("Soyad:", soyad);
  console.log("Doğum Yılı:", birthYear);

  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <TCKimlikNoDogrula xmlns="http://tckimlik.nvi.gov.tr/WS">
      <TCKimlikNo>${tcNo}</TCKimlikNo>
      <Ad>${ad}</Ad>
      <Soyad>${soyad}</Soyad>
      <DogumYili>${birthYear}</DogumYili>
    </TCKimlikNoDogrula>
  </soap:Body>
</soap:Envelope>`;

  try {
    const res = await fetch("https://tckimlik.nvi.gov.tr/Service/KPSPublic.asmx", {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": "http://tckimlik.nvi.gov.tr/WS/TCKimlikNoDogrula",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: soapEnvelope,
    });

    console.log("Status Code:", res.status);
    const responseText = await res.text();
    console.log("Response Body:\n", responseText);

    const matches = responseText.match(/<TCKimlikNoDogrulaResult\s*>(true|false)<\/TCKimlikNoDogrulaResult\s*>/i);
    const isValid = matches ? matches[1].toLowerCase() === "true" : false;
    console.log("Is Valid:", isValid);
  } catch (error) {
    console.error("Fetch Error:", error);
  }
}

test();

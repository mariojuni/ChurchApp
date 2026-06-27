const apiKey = "RAhHurUzL1pk5kt9LwrGIaz0AdnX0obcIH6NNIayuvGogR7f";
async function test() {
  const res = await fetch("https://api.youversion.com/v1/languages?limit=2000", {
    headers: { "x-yvp-app-key": apiKey }
  });
  const data = await res.json();
  console.log("Total languages:", data.data.length);
  const eng = data.data.find(l => l.language === 'en' || l.language === 'eng');
  console.log("English:", eng?.language);
}
test();

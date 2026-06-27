const apiKey = "RAhHurUzL1pk5kt9LwrGIaz0AdnX0obcIH6NNIayuvGogR7f";

async function test() {
  try {
    const res = await fetch("https://api.youversion.com/v1/bibles/3034/passages/MAT.1.1?format=text", {
      headers: {
        "x-yvp-app-key": apiKey
      }
    });
    
    console.log("Status:", res.status);
    const data = await res.text();
    console.log("Data:", data.substring(0, 500));
  } catch (err) {
    console.error(err);
  }
}
test();

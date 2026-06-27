const apiKey = "RAhHurUzL1pk5kt9LwrGIaz0AdnX0obcIH6NNIayuvGogR7f";
async function test() {
  const res = await fetch("https://api.youversion.com/v1/bibles/3034/index", {
    headers: { "x-yvp-app-key": apiKey }
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2).substring(0, 500));
}
test();

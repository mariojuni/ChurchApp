const apiKey = "RAhHurUzL1pk5kt9LwrGIaz0AdnX0obcIH6NNIayuvGogR7f";
async function test() {
  const res = await fetch("https://api.youversion.com/v1/bibles/3034/passages/MAT.1?format=html", {
    headers: { "x-yvp-app-key": apiKey }
  });
  const data = await res.json();
  console.log(data.content.substring(0, 1000));
}
test();

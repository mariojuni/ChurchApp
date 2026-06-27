const apiKey = "RAhHurUzL1pk5kt9LwrGIaz0AdnX0obcIH6NNIayuvGogR7f";

async function test() {
  const promises = [];
  for(let i=1; i<=20; i++) {
    promises.push(
      fetch(`https://api.youversion.com/v1/bibles/3034/passages/MAT.1.${i}?format=text`, {
        headers: { "x-yvp-app-key": apiKey }
      }).then(r => r.status)
    );
  }
  const results = await Promise.all(promises);
  console.log(results);
}
test();

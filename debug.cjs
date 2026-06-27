const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

  // Let's just mock the AuthContext by injecting a fake user in local storage or something
  // Or better, we can just intercept the network requests if it's firebase.
  // The easiest way is to mock localStorage for the app if we know how it stores it.
  
  // Since we don't have an easy way to login, let's just render the QRScanner component in a test harness!
  await browser.close();
})();

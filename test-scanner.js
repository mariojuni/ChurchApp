import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  
  await page.goto('http://localhost:5173');
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('Logging in...');
  await page.type('input[type="email"]', 'staff@church.com');
  await page.type('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 3000));
  
  console.log('Clicking QR Scanner Button...');
  try {
    await page.evaluate(() => {
      // Find the QR button inside fab-menu
      const fabBtn = document.querySelector('.fab');
      if(fabBtn) fabBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    
    await page.evaluate(() => {
      const qrBtn = Array.from(document.querySelectorAll('.fab-menu-item')).find(el => el.title === 'Check In');
      if(qrBtn) qrBtn.click();
    });
  } catch(e) { console.log('Failed to click QR', e); }
  
  await new Promise(r => setTimeout(r, 3000));
  
  await page.screenshot({ path: 'scanner-test.png' });
  console.log('Screenshot taken!');
  
  await browser.close();
})();

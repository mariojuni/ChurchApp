import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  
  // Fake the authentication to bypass the login screen without hitting Firebase
  await page.evaluateOnNewDocument(() => {
    window.localStorage.setItem('church_app_user', JSON.stringify({
      uid: 'fake-uid',
      email: 'staff@church.com',
      role: 'admin'
    }));
  });

  await page.goto('http://localhost:5173');
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('Clicking QR Scanner Button...');
  try {
    // Check if we are on the dashboard or attendance
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('Body length before click:', bodyText.length);
    
    // Find the fab button
    await page.evaluate(() => {
      const fabBtn = document.querySelector('.fab');
      if(fabBtn) fabBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));
    
    // Find the Check In button
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.fab-menu-item'));
      const qrBtn = btns.find(b => b.title === 'Check In');
      if(qrBtn) qrBtn.click();
    });
    
  } catch(e) { console.log('Failed to click QR', e); }
  
  await new Promise(r => setTimeout(r, 2000));
  
  // Grab the HTML of the main container
  const html = await page.evaluate(() => {
    const screens = document.querySelector('.screens');
    return screens ? screens.outerHTML : document.body.innerHTML;
  });
  
  console.log('DOM HTML:');
  console.log(html);
  
  await page.screenshot({ path: 'scanner-test2.png' });
  console.log('Screenshot taken!');
  
  await browser.close();
})();

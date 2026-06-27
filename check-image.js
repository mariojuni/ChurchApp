import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';

(async () => {
  try {
    const image = await loadImage('scanner-test.png');
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let isWhite = true;
    let isBlack = true;
    
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] !== 255 || data[i+1] !== 255 || data[i+2] !== 255) isWhite = false;
      if (data[i] !== 0 || data[i+1] !== 0 || data[i+2] !== 0) isBlack = false;
    }
    
    console.log('Is solid white?', isWhite);
    console.log('Is solid black?', isBlack);
    console.log('Width:', canvas.width, 'Height:', canvas.height);
  } catch(e) {
    console.log('Error analyzing image:', e);
  }
})();

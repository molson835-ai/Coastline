const { test, expect } = require('@playwright/test');

test('mobile D-pad controls steer in the perceived direction and remain usable', async ({ page }) => {
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await page.setViewportSize({width:390,height:844});
  await page.goto('/game-v3.html?devStaticWorld=1&beta=mobile-dpad-regression',{waitUntil:'domcontentloaded'});
  await expect(page.locator('canvas').first()).toBeAttached({timeout:30000});
  await page.waitForFunction(()=>Boolean(window.__coastlineTest&&window.__coastlineTransitionTest),null,{timeout:30000});
  await page.waitForFunction(()=>window.__coastlineVehicleAssetSwapStatus?.ok===true,null,{timeout:45000});

  const forward=page.locator('.left-controls button[data-k="w"]');
  const reverse=page.locator('.left-controls button[data-k="s"]');
  const left=page.locator('.right-controls button[data-k="a"]');
  const right=page.locator('.right-controls button[data-k="d"]');
  const action=page.locator('#actionButton');
  for(const control of [forward,reverse,left,right,action])await expect(control).toBeVisible();
  await expect(page.locator('#driveStick')).toHaveCount(0);
  await expect(page.locator('#driveControls')).toHaveCount(0);

  const spawn=await page.evaluate(()=>{
    const api=window.__coastlineTest,roster=api.vehicleRoster();
    for(let x=700;x>=-700;x-=50)for(let z=700;z>=-700;z-=50){
      if(roster.some(v=>Math.hypot(v.x-x,v.z-z)<12))continue;
      let clear=true;
      for(let dx=-6;dx<=6&&clear;dx+=3)for(let dz=-30;dz<=30;dz+=1.5){
        const px=x+dx,pz=z+dz;
        if(api.obstacleBlocked(px,pz,1.8)||api.pedestrianCollisionBlocked(px,pz,1.8)||roster.some(v=>Math.hypot(v.x-px,v.z-pz)<7)){clear=false;break;}
      }
      if(clear)return{x,z};
    }
    return null;
  });
  expect(spawn,'a clear test lane should exist').not.toBeNull();
  await page.evaluate(({x,z})=>window.__coastlineTest.setVehiclePosition(x,z,0),spawn);
  const before=await page.evaluate(()=>window.__coastlineTest.state());
  const gas=await forward.boundingBox();
  await page.mouse.move(gas.x+gas.width/2,gas.y+gas.height/2);
  await page.mouse.down();
  try{await page.evaluate(()=>window.__coastlineTest.advanceTestFrame(1/60,60));}finally{await page.mouse.up();}
  const driven=await page.evaluate(()=>window.__coastlineTest.state());
  expect(Math.hypot(driven.x-before.x,driven.z-before.z),'accelerator should move the car').toBeGreaterThan(.5);

  const leftBox=await left.boundingBox(),beforeLeft=(await page.evaluate(()=>window.__coastlineTest.state())).heading;
  await page.mouse.move(leftBox.x+leftBox.width/2,leftBox.y+leftBox.height/2);
  await page.mouse.down();
  try{await page.evaluate(()=>window.__coastlineTest.advanceTestFrame(1/60,30));}finally{await page.mouse.up();}
  const afterLeft=(await page.evaluate(()=>window.__coastlineTest.state())).heading;
  expect(afterLeft-beforeLeft,'screen-left D-pad must turn left in the behind-car view').toBeGreaterThan(.01);

  const rightBox=await right.boundingBox(),beforeRight=afterLeft;
  await page.mouse.move(rightBox.x+rightBox.width/2,rightBox.y+rightBox.height/2);
  await page.mouse.down();
  try{await page.evaluate(()=>window.__coastlineTest.advanceTestFrame(1/60,30));}finally{await page.mouse.up();}
  const afterRight=(await page.evaluate(()=>window.__coastlineTest.state())).heading;
  expect(afterRight-beforeRight,'screen-right D-pad must turn right in the behind-car view').toBeLessThan(-.01);

  await action.click({force:true});
  await expect(page.locator('#mode')).toHaveText('ON FOOT');
  await expect(action).toHaveText('USE');
  expect((await page.evaluate(()=>window.__coastlineTest.state())).avatarVisible).toBe(true);
  expect(pageErrors).toEqual([]);
});

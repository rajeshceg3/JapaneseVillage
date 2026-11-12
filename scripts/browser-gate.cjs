const fs=require('fs'),assert=require('node:assert'),pp=require('puppeteer-core'),{spawn}=require('child_process');
(async()=>{let server,b;try{
 if(!process.env.URL){server=spawn('python3',['-m','http.server','8835'],{stdio:'ignore'});await new Promise(r=>setTimeout(r,350))}
 b=await pp.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.setViewport({width:390,height:844});await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 await p.evaluateOnNewDocument(()=>{try{localStorage.setItem('jv-chrome-pin','1')}catch(e){};const st=window.setTimeout;window.setTimeout=(fn,ms,...a)=>st(fn,ms>20000?250:ms,...a);const c=AudioNode.prototype.connect;AudioNode.prototype.connect=function(d,...a){const r=c.call(this,d,...a);if(d instanceof AudioDestinationNode){if(!this.context.__tee)this.context.__tee=this.context.createMediaStreamDestination();window.__tee=this.context.__tee;c.call(this,this.context.__tee)}return r}});
 await p.goto(process.env.URL||'http://127.0.0.1:8835',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.villageSound,{timeout:45000});assert.equal(await p.evaluate(()=>window.villageSound.state.ctx),null);
 console.log('Sound control');await p.click('#sound');await p.waitForFunction(()=>window.villageSound.state.ctx.state==='running');const dir=process.env.AUDIO_OUT||'verification/audio';fs.mkdirSync(dir,{recursive:true});
 for(const [i,z] of [0,1,2,3,4,5].entries()){if(process.env.INDEXES&&!process.env.INDEXES.split(',').map(Number).includes(i))continue;console.log('CHECK palette',i);
  await p.click('[data-place="'+z+'"]');await p.waitForFunction(i=>window.villageSound.state.place===i,{},i);await new Promise(r=>setTimeout(r,2500));assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const bounds=await p.$eval('#sound',e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}});assert(bounds.left>=0&&bounds.right<=390&&bounds.bottom<=844&&bounds.height>=44);
  const bytes=await p.evaluate(async()=>{const chunks=[],r=new MediaRecorder(window.__tee.stream);r.ondataavailable=e=>chunks.push(e.data);const done=new Promise(ok=>r.onstop=ok);r.start();await new Promise(ok=>setTimeout(ok,3000));r.stop();await done;return [...new Uint8Array(await new Blob(chunks,{type:r.mimeType}).arrayBuffer())]});fs.writeFileSync(dir+'/village-app-'+i+'.webm',Buffer.from(bytes));await p.screenshot({path:dir+'/390-'+i+'.png'});
 }
 console.log('Sound control');await p.click('#sound');await p.waitForFunction(()=>window.villageSound.state.ctx===null);console.log('Sound control');await p.click('#sound');await p.waitForFunction(()=>window.villageSound.state.ctx.state==='running');await p.click('#sound');assert.deepEqual(errors,[]);console.log('PASS six biomes, silent start, opt-in, close/replay, sound button bounds, no errors');
 // quiet-by-default pass: no pin, chrome greets then retires, the chochin remains
 {const q=await b.newPage(),qerr=[];q.on('pageerror',e=>qerr.push(e.message));
  await q.setViewport({width:390,height:844});await q.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  await q.evaluateOnNewDocument(()=>{try{localStorage.removeItem('jv-chrome-pin')}catch(e){}});
  await q.goto(process.env.URL||'http://127.0.0.1:8835',{waitUntil:'domcontentloaded'});
  await q.waitForFunction(()=>window.villageSound,{timeout:45000});
  await new Promise(r=>setTimeout(r,3400));
  assert.equal(await q.$eval('.chrome-hint',e=>getComputedStyle(e).display),'grid','chrome retired and the chochin hint is showing');
  assert.equal(await q.$eval('nav.places',e=>getComputedStyle(e).visibility),'hidden','ema rail retired');
  assert.equal(await q.$eval('.hud',e=>getComputedStyle(e).visibility),'visible','story card never retires');
  const hb=await q.$eval('.chrome-hint',e=>{const r=e.getBoundingClientRect();return{w:r.width,h:r.height}});assert(hb.w>=44&&hb.h>=44,'hint keeps a 44px hit area');
  await q.screenshot({path:dir+'/390-quiet.png'});
  await q.click('.chrome-hint');await new Promise(r=>setTimeout(r,400));
  assert.equal(await q.$eval('nav.places',e=>getComputedStyle(e).visibility),'visible','hint woke the rail');
  await q.screenshot({path:dir+'/390-woken.png'});
  await q.keyboard.press('Escape');await new Promise(r=>setTimeout(r,400));
  assert.equal(await q.$eval('nav.places',e=>getComputedStyle(e).visibility),'hidden','Escape retired the rail');
  assert.deepEqual(qerr,[]);await q.close();
  console.log('PASS quiet chrome: retire, hint, wake, Escape');}
}finally{if(b){const proc=b.process();await b.disconnect();proc?.kill('SIGTERM')}server?.kill()}})().catch(e=>{console.error(e);process.exit(1)});

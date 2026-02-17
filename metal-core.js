window.initMetalPaint = async function initMetalPaint(url='metal-stack-worklet.js'){
  if(!('paintWorklet' in CSS)) { alert('CSS Paint API not supported in this browser.'); return; }
  await CSS.paintWorklet.addModule(url);
};

self.Module = {
    // locateFile: function (s) {
    //     console.log(s);
    //     return s;
    // },
    // Add this function
    onRuntimeInitialized: function() {
        self.postMessage('ready');
    }
};


importScripts('webassembly/wasmminer.js');
// fetch('webassembly/wasmminer.js').then(response => response.text()).then(eval);

self.addEventListener('message', (e)=>{
  // if (!Module) Module = JSON.parse(e.data); // Module being sent over
  let minedBlock = Module.ccall('mineBlock', 'string', ['string', 'int'], [e.data.blockstring, e.data.dfc]);
  self.postMessage(minedBlock);
});

// self.importScripts('webassembly/wasmminer.js');

// console.log('yeet');
// fetch("webassembly/wasmminer.wasm").then(response => {
//   console.log('got resp', response);
//   return response.arrayBuffer();
// }).then(bytes => {
//   console.log('bytes (jk he\'s really friendly)', bytes);
//   return WebAssembly.compile(bytes);
// }).then(WasmModule => {
//   console.log(WasmModule);
//   console.log(WebAssembly.Instance(WasmModule));
//   let insta = (new WebAssembly.Instance(WasmModule));
//   console.log(insta);
//   // g_WebWorker.postMessage(WasmModule)
//   self.addEventListener('message', (e)=>{
//     let minedBlock = Module.ccall('mineBlock', 'string', ['string', 'int'], [e.data.blockstring, e.data.dfc]);
//     self.postMessage(minedBlock);
//   });
//   console.log('ready');
//   self.postMessage('ready'); // tell main thread we are ready
// });


// self.addEventListener('message', (e)=>{
//   if (!Module) Module = e.data;
//   let minedBlock = Module.ccall('mineBlock', 'string', ['string', 'int'], [e.data.blockstring, e.data.dfc]);
//   self.postMessage(minedBlock);
// });


// function loadWasm(fileName) {
//   return fetch(fileName)
//     .then(response => response.arrayBuffer())
//     .then(bits => WebAssembly.compile(bits))
//     .then(module => { return new WebAssembly.Instance(module) });
// };
//
// loadWasm('webassembly/wasmminer.wasm')
//   .then(instance => {
//     console.log(instance);
//     let fib = instance.exports.__Z3fibi;
//     console.log(fib(1));
//     console.log(fib(20));
//   });

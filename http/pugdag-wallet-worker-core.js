//import "@pugdag/wallet-worker/worker.js";
//if(typeof window == 'undefined')
	globalThis['window'] = globalThis;

require("@pugdag/wallet-worker/worker.js")

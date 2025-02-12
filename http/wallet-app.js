import {RPC} from '/@pugdag/grpc-web';
//console.log("PWA", window.PWA)
//console.log("RPC", RPC)
import '/style/style.js';
import {
	dpc, html, css, FlowApp, BaseElement, i18n
} from '/flow/flow-ux/flow-ux.js';
import {isMobile} from '/@pugdag/ux/pugdag-ux.js';
export * from '/@pugdag/ux/pugdag-ux.js';

window.__testI18n = (test)=>i18n.setTesting(!!test);

class PugdagWalletHeader extends BaseElement{
	static get styles(){
		return css`
			:host{display:block}
			.container{
				display:flex;align-items:center;padding:5px;
			}
			.logo{
				height:30px;width:30px;/*background-color:#DDD;*/
				background:no-repeat url('/resources/images/pugdag.png') center;
				background-size:contain;
			}
			.flex{flex:1}

		`
	}
	render(){
		return html`
			<div class="container">
				<div class="logo"></div>
				<div class="flex"></div>
				<!--a class="link">About us</a-->
			</div>
		`
	}
}
PugdagWalletHeader.define("pugdag-wallet-header")

class PugdagWalletApp extends FlowApp {

	static get properties(){
		return {
			network:{type:String},
			networks:{type:Array},
			addresses:{type:Object},
			available:{type:Object},
			limits:{type:Object}
		}
	}
	constructor(){
		super();

		this.networks = ['pugdag','pugdagtest','pugdagev','pugdagsim'];
		this.network = "pugdag";
		this.addresses = {};
		this.available = {};
		this.limits = {};
		this.opt = {};

		this.aliases = {
			pugdag : 'MAINNET',
			pugdagtest : 'TESTNET',
			pugdagev : 'DEVNET',
			pugdagsim : 'SIMNET'
		}

		this.initLog();
		dpc(async ()=>this.init());
		this.registerListener("popstate", (e)=>{
			let {menu="home", args=[]} = e.state||{};
			console.log(`popstate: ${document.location}, state: ${JSON.stringify(e.state)}`)
			console.log(`NETWORK ========= : ${this.network}`)
			//this.setMenu(menu, args, true);
		});
	}

	async init(){
		await this.initSocketRPC({
			timeout : 90,
			args:{
				transports:["websocket"]
			}
		});
		await this.initUI();
		dpc(()=>this.setLoading(false));
	}

	async initUI(){
		this.bodyEl = document.body;
		await this.getNetwork();
		await this.initI18n();
	}

	async getNetwork(){
		const { rpc } = flow.app;
		let {network} = await rpc.request("get-network")
		.catch((err)=>{
			console.log("get-network:error", err)
		});

		if(network && this.network != network){
			this.network = network;
		}
	}

	async initI18n(){
		i18n.setActiveLanguages(['en', 'de', 'fr', 'id', 'it', 'pt_BR', 'ja', 'ko', 'zh']);
		//i18n.setTesting(true);
		const { rpc } = flow.app;
		let {entries} = await rpc.request("get-app-i18n-entries")
		.catch((err)=>{
			console.log("get-app-i18n-entries:error", err)
		})
		if(entries)
			i18n.setEntries(entries);
	}

	onlineCallback() {
		const { rpc } = flow.app;
		this.networkUpdates = rpc.subscribe(`networks`);
		(async()=>{
			for await(const msg of this.networkUpdates) {
				const { networks } = msg.data;
				this.networks = networks;
				if(!this.networks.includes(this.network))
					this.network = this.networks[0];
				console.log("available networks:", networks);
				this.requestUpdate();
			}
		})().then();

		this.addressUpdates = rpc.subscribe(`addresses`);
		(async()=>{
			for await(const msg of this.addressUpdates) {
                const { addresses } = msg.data;
                this.addresses = addresses;
                this.requestUpdate();
				// this.networks = networks;
				// console.log("available networks:",networks);
			}
		})().then();

		this.limitUpdates = rpc.subscribe(`limit`);
		(async()=>{
			for await(const msg of this.limitUpdates) {
				const { network, limit, available } = msg.data;
				console.log('limits',msg.data);
				this.limits[network] = limit;
				this.available[network] = available;
				if(this.network == network)
					this.requestUpdate();
			}
		})().then();
	}

	offlineCallback() {
		this.networkUpdates?.close();
		this.addressUpdates?.close();
		this.limitUpdates?.close();
	}

	render(){
		let network = this.network;
		let address = this.addresses?.[this.network] || '';
		let limit = this.limits?.[this.network] || '';
		let available = this.available?.[this.network] || '';
		let meta = {"generator":"pwa"}

		return html`
		${isMobile?'':html`<!--pugdag-wallet-header></pugdag-wallet-header-->`}
		<pugdag-wallet .walletMeta='${meta}' reloadonlock="true" hidefaucet="true"></pugdag-wallet>
		`
	}

	onNetworkChange(e){
		console.log("on-network-change", e.detail)
		this.network = e.detail.network;
	}

	firstUpdated(){
		super.firstUpdated();
		console.log("app: firstUpdated")
		this.wallet = this.renderRoot.querySelector("pugdag-wallet");
		//console.log("this.wallet", this.wallet)
		let verbose = localStorage.rpcverbose == 1;
		this.wallet.setRPCBuilder(()=>{
			return {
				rpc: new RPC({verbose, clientConfig:{path:"/rpc"}}),
				network: this.network
			}
		});
	}

}

PugdagWalletApp.define("pugdag-wallet-app");

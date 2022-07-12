import { Inspector, Relation } from './chainspider.mjs';
import web3 from './blockchain.mjs';
import { bep20, pancakeLP, pancakeFactory } from './lib/abi.mjs';
import fetch from 'cross-fetch';

import { ContractFinder} from './modules/ContractFinder.mjs';
import { LPFactoryFinder } from './modules/LPFactoryFinder.mjs';

function proxyUrl(url) {
  return 'https://corsproxy.io/?' + encodeURI(url);
}

export class WhitelistChecker extends Inspector {
  constructor(cs) { 
    super(cs, 'WhitelistChecker');
    this.subscribe('Contract', 'is-token');
  }
  
  async onRelation(r) {
    let addr = r.src_node.relative('is-contract').val;
    let res = await fetch(proxyUrl('https://github.com/pancakeswap/token-list/raw/main/src/tokens/cmc.json'));
    let tokens = await res.json();
    
    let { symbol, name } = r.dst_node.val;
    let match = false;
    for (let wt of tokens) {
      let wtaddr = wt.address.toLowerCase();
      
      if (wt.name == name && wt.symbol == symbol) {
        match = true;
        if (wtaddr == addr) {
          let w = this.cs.createNode( 'WhitelistedToken', { 'platform': 'cmc', 'logoURI': wt.logoURI });
          this.cs.createRelation( r.dst_node, 'is-whitelisted', w );
          this.cs.reportMessage( this.id, addr, 100, 'Token '+name+' was found in the CoinMarketCap whitelist.' );
        } else {
          this.cs.reportMessage( this.id, addr, -100, 'Token attempting to impersonate ' + wt.name + ' but contract address is incorrect' );
        }
      } else if (wt.name == name) {
        match = true;
        this.cs.reportMessage( this.id, addr, -50, 'Token attempting to impersonate ' + wt.name + ' but symbol is incorrect' );
      }

    }
    
    if (!match) {
      this.cs.reportMessage( this.id, addr, -5, 'Token '+name+' was not found in CMC whitelist.' );
      this.cs.createEvent( r.dst_node, '@not-whitelisted' );
    }
    
  }

  static getStyles() {
    return [{
		  selector: 'node[type="WhitelistedToken"]',
		  style: {
		    'height': 64,
		    'width': 64,
		    'shape': 'round-rectangle',		    
		    'background-image': 'data(logoURI)',
		    'background-color': 'white',
		    'content': 'data(platform)'
		  }
	    }];    
  }
  
}

export class TokenFinder extends Inspector {
  constructor(cs) { 
    super(cs, 'TokenFinder');
    this.subscribe('BlockchainAddress', 'is-contract');
  }
  
  async onRelation(r) {
    let addr = r.src_node.val;  
    const token_abi = await new web3.eth.Contract( bep20, addr );
    const lp_abi = await new web3.eth.Contract( pancakeLP, addr );
    
    let symbol;
    try {
      symbol = await token_abi.methods.symbol().call();
    } catch(err) {
      console.error(this.id, 'error', err);
      return;
    }
    
    let is_amm = false;
    try {
       let reserves = await lp_abi.methods.getReserves().call();
       is_amm = true;
    } catch(err) {
       if (err.message != 'Returned error: execution reverted' && err.message != "Returned values aren't valid, did it run Out of Gas? You might also see this error if you are not using the correct ABI for the contract you are retrieving data from, requesting data from a block number that does not exist, or querying a node which is not fully synced.") {
         console.error(err.message);
         return;
       }
    }
    
    if (is_amm) {
      let asset;
      let base;
      try {
        asset = await lp_abi.methods.token0().call();
        base = await lp_abi.methods.token1().call();
      } catch(err) {
        console.error(this.id, 'error', err);
        return;
      }

      let asset_name;
      let base_name;
      
      try {
        const asset_abi = await new web3.eth.Contract( bep20, asset );
        const base_abi = await new web3.eth.Contract( bep20, base );
        
        asset_name = await asset_abi.methods.symbol().call();
        base_name = await base_abi.methods.symbol().call();
        
      } catch(err) {
        console.error(this.id, 'error', err);
        return;
      }
      
      let name = asset_name+'/'+base_name+' '+symbol;
      let t = this.cs.createNode('TokenAMM', { asset: asset.toLowerCase(), base: base.toLowerCase(), name, asset_name, base_name });
      this.cs.createRelation(r.dst_node, 'is-amm', t);
      
      let a = this.cs.createNode('BlockchainAddress', asset.toLowerCase());     
      if (a.relative('is-contract') && a.relative('is-contract').relative('is-token')) {
        this.cs.createRelation( a.relative('is-contract').relative('is-token'), 'trades-on', t );
      }
      
      let b = this.cs.createNode('BlockchainAddress', base.toLowerCase());      
      if (b.relative('is-contract') && b.relative('is-contract').relative('is-token')) {
        this.cs.createRelation( b.relative('is-contract').relative('is-token'), 'bases', t );
      }
      
      return;
    }
    
    let info;
    try {
      info = {
        //contractAddress: addr,
        totalSupply: await token_abi.methods.totalSupply().call(),
        symbol,
        name: await token_abi.methods.name().call(),
        decimals: await token_abi.methods.decimals().call()
      }
    } catch(err) {
      console.error(this.id, 'error', err);
      return;
    }

    let t = this.cs.createNode('TokenBEP20', info);
    this.cs.createRelation(r.dst_node, 'is-token', t);    
  }
  
}

export class PairTokenFinder extends Inspector {
  constructor(cs) { 
    super(cs, 'PairTokenFinder');
    this.subscribe('Contract', 'is-token');
  }
  
  async onRelation(r) {
    let token_addr = r.src_node.relative('is-contract');
    
    let amms = this.cs.nodes.filter( (x)=> { return x.type == 'TokenAMM'; } );
    for (let amm of amms) {
      //console.log(this.id, token, amm);
      if (amm.val.base == token_addr.val) {
        this.cs.createRelation( r.dst_node, 'trades-on', amm );
      }
      if (amm.val.asset == token_addr.val) {
        this.cs.createRelation( r.dst_node, 'bases', amm );
      }
    }
  }
}

export class TopHoldersChecker extends Inspector {
  constructor(cs) { 
    super(cs, 'TopHoldersChecker');
        
    this.subscribe('TokenBEP20', '@holders-expanded');
  }

  async onRelation(r) {
    let addr = r.src_node.relative('is-token').relative('is-contract').val;
    
    let holders = r.src_node.relations.getRelation('holder', null).map( (x)=>{ return x.val } );
    
    console.log(this.id, 'Starting analysis of '+addr+' with '+holders.length+' holders');
    const token_abi = await new web3.eth.Contract( bep20, addr );
    
    const { totalSupply, decimals } = r.src_node.val;
    
    let ts = BigInt(totalSupply) / BigInt(10**decimals);
    
    let report = { 'balances': {}, totalSupply, decimals }
    
    let balances = report.balances;
    for (let holder of holders) {
      balances[holder] = await token_abi.methods.balanceOf(holder).call();

      console.log(this.id, holder, balances[holder]);
      
      let b = BigInt(balances[holder]) / BigInt(10**decimals);
      let bnr = BigInt(1000) * BigInt(balances[holder]) / BigInt(totalSupply);
      let ratio = parseFloat(bnr.toString())/10.0;
      
      if (ratio > 100.0) {
        r.src_node.reportMessage(this.id, addr, -100, 'Token holder '+holder+' has '+ratio.toFixed(0)+'% of supply.');
      } else if (ratio > 33.0) {
        r.src_node.reportMessage(this.id, addr, -25, 'Token holder '+holder+' has over 33% of supply.');
      }
    }
    
    this.cs.createRelation(r.src_node, 'top-holders', this.cs.createNode('TopHoldersReport', report));
  }
}

export class LPChecker extends Inspector {

  constructor(cs) { 
    super(cs, 'LPChecker');
    
    this.amount = 10000000000000;
    this.subscribe('Contract', 'is-amm');
  }

  async onRelation(r) {
    let { asset, base } = r.dst_node.val;

    let base_abi = await new web3.eth.Contract( bep20, base );
    let asset_abi = await new web3.eth.Contract( bep20, asset );

    let addr = r.src_node.relative('is-contract').val;
       
    let liquidityPair = await new web3.eth.Contract( pancakeLP, addr );
    let reserves = await liquidityPair.methods.getReserves().call();
    
    //console.log(reserves);
    let assetReserve = reserves[0];
    let baseReserve = reserves[1];
    
    let assetSupply = await asset_abi.methods.totalSupply().call();
    
    let asset_ratio_1e3 = BigInt(1000) * BigInt(assetReserve) / BigInt(assetSupply);
    let asset_ratio = parseFloat(asset_ratio_1e3.toString())/10.0;
    
    if (asset_ratio > 100.0) {
      this.cs.reportMessage(this.id, asset, -100, r.dst_node.val.name+' has '+asset_ratio.toFixed(0)+'% of asset supply, has likely been rugged.');
    }
    
    let baseBNB_1e3 = BigInt(baseReserve) / BigInt(10**15);
    let baseBNB = parseFloat(baseBNB_1e3.toString()) / 1000.0;
    console.log(baseBNB);
    
    if (baseBNB < 1) {
      this.cs.reportMessage(this.id, asset, -100, r.dst_node.val.name+' has very low liquidity, has likely been rugged.');
    }
    
    //console.log(this.id, assetReserve, baseReserve, assetSupply, asset_ratio);
    
  }
}

export class LP1inchFinder extends Inspector {
  constructor(cs) { 
    super(cs, 'LP1inchFinder');

    this.auto_expand = true;
    this.auto_expand_exclude = [ 
      '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',  // WBNB
      '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82',  // CAKE
      '0xe9e7cea3dedca5984780bafc599bd69add087d56'   // BUSD
    ];
    
    this.amount = 10000000000000;
    this.subscribe('Contract', 'is-token');
  }
  
  async onRelation(r) {
    let addr = r.src_node.relative('is-contract').val;
    if (this.auto_expand_exclude.indexOf(addr) > -1 || !this.auto_expand) { return; }

    let url = 'https://pathfinder.1inch.io/v1.2/chain/56/router/v4/quotes?deepLevel=2&mainRouteParts=10&parts=50&virtualParts=50&walletAddress=null&fromTokenAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'+'&toTokenAddress='+addr+'&amount='+this.amount+ "&gasPrice=20000000000&protocolWhiteList=BURGERSWAP,PANCAKESWAP,VENUS,JULSWAP,BAKERYSWAP,BSC_ONE_INCH_LP,ACRYPTOS,BSC_DODO,APESWAP,SPARTAN,SPARTAN_V2,VSWAP,VPEGSWAP,HYPERSWAP,BSC_DODO_V2,SWAPSWIPE,ELLIPSIS_FINANCE,BSC_NERVE,BSC_SMOOTHY_FINANCE,CHEESESWAP,BSC_PMM1,PANCAKESWAP_V2,MDEX,WARDEN,WAULTSWAP,BSC_ONE_INCH_LIMIT_ORDER,BSC_ONE_INCH_LIMIT_ORDER_V2,BSC_PMM3,BSC_PMM7,ACSI_FINANCE,GAMBIT_FINANCE,JETSWAP,BSC_UNIFI,BSC_PMMX,BSC_KYBER_DMM,BSC_BI_SWAP,BSC_DOPPLE,BABYSWAP,BSC_PMM2MM,WOOFI,BSC_ELK,BSC_SYNAPSE,BSC_AUTOSHARK,BSC_CAFE_SWAP,BSC_PMM5,PLANET_FINANCE,BSC_ANNEX_FINANCE,BSC_ANNEX_SWAP,BSC_RADIOSHACK&protocols=BURGERSWAP,PANCAKESWAP,VENUS,JULSWAP,BAKERYSWAP,ACRYPTOS,BSC_DODO,APESWAP,SPARTAN,SPARTAN_V2,VSWAP,VPEGSWAP,HYPERSWAP,BSC_DODO_V2,SWAPSWIPE,ELLIPSIS_FINANCE,BSC_NERVE,BSC_SMOOTHY_FINANCE,CHEESESWAP,PANCAKESWAP_V2,MDEX,WARDEN,WAULTSWAP,ACSI_FINANCE,GAMBIT_FINANCE,JETSWAP,BSC_UNIFI,BSC_KYBER_DMM,BSC_BI_SWAP,BSC_DOPPLE,BABYSWAP,WOOFI,BSC_ELK,BSC_SYNAPSE,BSC_AUTOSHARK,BSC_CAFE_SWAP,PLANET_FINANCE,BSC_ANNEX_FINANCE,BSC_ANNEX_SWAP,BSC_RADIOSHACK&deepLevels=1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1&mainRoutePartsList=1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1&partsList=1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1&virtualPartsList=1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1";

    let d = await fetch(url);
    let j = await d.json();
    let markets = [];
    
    if (!j.results) {
      console.error('1inch API failed');
      return;
    }
   
    for (let r of j.results) {
      for (let route of r.routes) {
        let sr = route.subRoutes;
        let mkt = sr[0][0].market;
        
        this.cs.createNode( 'BlockchainAddress', mkt.id.toLowerCase() );
      }
    }
    
    console.log(markets);
  } 

}

export class TopHoldersFinder extends Inspector {
  constructor(cs, doSubscribe = true) { 
    super(cs, 'TokenFinder');
    
    this.top = 25;
    
    this.auto_expand = true;
    this.auto_expand_exclude = [ 
      '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',  // WBNB
      '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82',  // CAKE
      '0xe9e7cea3dedca5984780bafc599bd69add087d56'   // BUSD
    ];
    
    if (doSubscribe) {
      this.subscribe('Contract', 'is-token');
    }
  }


  async onRelation(r) {
    let addr = r.src_node.relative('is-contract').val;
    if (this.auto_expand_exclude.indexOf(addr) > -1 || !this.auto_expand) { return; }
    
    let url = 'https://faas-tor1-70ca848e.doserverless.co/api/v1/web/fn-cac7949f-cce3-45ab-9d17-9285a0935f75/chainspider/getTopHolders?addr='+addr+'&top='+this.top; 

    let res = await fetch(url);
    if (res.status != 200) {
       this.cs.reportMessage(this.id, addr, 0, 'Top holders lookup failed with result code '+res.status);
       return;
    }
    
    let data = await res.json();
    
    for (let holder of data) { 
        let n = this.cs.createNode('BlockchainAddress', holder.address);
        this.cs.createRelation(n, 'holder', r.dst_node);
        
        //await new Promise(resolve => setTimeout(resolve, ANIMATE_DELAY));
    }
    
    this.cs.createEvent( r.dst_node, '@holders-expanded' );
    
  }
  
}

export function registerModules(cs) {
  new ContractFinder(cs);
  new TokenFinder(cs);
  new WhitelistChecker(cs);
  new TopHoldersChecker(cs);
  new PairTokenFinder(cs);
  new LPChecker(cs);
  
  //new LP1inchFinder(cs);
  new LPFactoryFinder(cs);
  
  let THF = new TopHoldersFinder(cs, false);
  return { THF };
}

export function getAllStyles() {
  return [
   ...ContractFinder.getStyles(),
   ...WhitelistChecker.getStyles()
  ];
}

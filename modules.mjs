import { Inspector, Relation } from './chainspider.mjs';
import web3 from './blockchain.mjs';
import { bep20, pancakeLP } from './lib/abi.mjs';
import fetch from 'cross-fetch';

export class ContractFinder extends Inspector {
  constructor(cs) { 
    super(cs, 'ContractFinder');
    this.subscribe('BlockchainAddress', '@on-create');
  }
  
  async onRelation(r) {
    let addr = r.src_node.val;
    let code = await web3.eth.getCode( addr );
    let source = null;
    
    if (code != '0x') {
      let c = this.cs.createNode('Contract', { code, source } );
      this.cs.createRelation(r.src_node, 'is-contract', c);
    }
    
  }

}

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
          r.dst_node.reportMessage( this.id, 100, 'Token '+name+' was found in the CoinMarketCap whitelist.' );
        } else {
          r.dst_node.reportMessage( this.id, -100, 'Token attempting to impersonate ' + wt.name + ' but contract address is incorrect' );
        }
      } else if (wt.name == name) {
        match = true;
        r.dst_node.reportMessage( this.id, -50, 'Token attempting to impersonate ' + wt.name + ' but symbol is incorrect' );
      }

    }
    
    if (!match) {
      r.dst_node.reportMessage( this.id, -5, 'Token '+name+' was not found in CMC whitelist.' );
      this.cs.createEvent( r.dst_node, '@not-whitelisted' );
    }
    
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
    
    let symbol;
    try {
      symbol = await token_abi.methods.symbol().call();
    } catch(err) {
      console.error(this.id, 'error', err);
      return;
    }     
    
    if (symbol == 'Cake-LP') {
      let lp_abi = await new web3.eth.Contract( pancakeLP, addr );
      let asset;
      let base;
      try {
        asset = await lp_abi.methods.token0().call();
        base = await lp_abi.methods.token1().call();
      } catch(err) {
        console.error(this.id, 'error', err);
        return;
      }

      let t = this.cs.createNode('TokenAMM', { asset: asset.toLowerCase(), base: base.toLowerCase() });
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
        r.src_node.reportMessage(this.id, -100, 'Token holder '+holder+' has '+ratio.toFixed(0)+'% of supply.');
      } else if (ratio > 33.0) {
        r.src_node.reportMessage(this.id, -25, 'Token holder '+holder+' has over 33% of supply.');
      }
    }
    
    this.cs.createRelation(r.src_node, 'top-holders', this.cs.createNode('TopHoldersReport', report));
  }
}

const ANIMATE_DELAY = 2000;

export class TopHoldersFinder extends Inspector {
  constructor(cs) { 
    super(cs, 'TokenFinder');
    
    this.top = 25;
    
    this.auto_expand = true;
    this.auto_expand_exclude = [ 
      '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',  // WBNB
      '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82',  // CAKE
      '0xe9e7cea3dedca5984780bafc599bd69add087d56'   // BUSD
    ];
    
    this.subscribe('Contract', 'is-token');
  }


  async onRelation(r) {
    let addr = r.src_node.relative('is-contract').val;
    if (this.auto_expand_exclude.indexOf(addr) > -1 || !this.auto_expand) { return; }
    
    let url = 'https://faas-tor1-70ca848e.doserverless.co/api/v1/web/fn-cac7949f-cce3-45ab-9d17-9285a0935f75/chainspider/getTopHolders?addr='+addr+'&top='+this.top; 

    let res = await fetch(url);
    if (res.status != 200) {
       r.dst_node.reportMessage(this.id, 0, 'Lookup failed with result code '+res.status);
       return;
    }
    
    let data = await res.json();
    
    for (let holder of data) { 
        let n = this.cs.createNode('BlockchainAddress', holder.address);
        this.cs.createRelation(n, 'holder', r.dst_node);
        
        await new Promise(resolve => setTimeout(resolve, ANIMATE_DELAY));
    }
    
    this.cs.createEvent( r.dst_node, '@holders-expanded' );
    
  }
  
}

export function registerModules(cs) {
  new ContractFinder(cs);
  new TokenFinder(cs);
  new WhitelistChecker(cs);
  new TopHoldersFinder(cs);
  new TopHoldersChecker(cs);
  new PairTokenFinder(cs);
}

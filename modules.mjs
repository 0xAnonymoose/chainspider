import { Inspector } from './chainspider.mjs';
import web3 from './blockchain.mjs';
import { bep20, pancakeLP } from './lib/abi.mjs';
import fetch from 'node-fetch';

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

export class WhitelistChecker extends Inspector {
  constructor(cs) { 
    super(cs, 'WhitelistChecker');
    this.subscribe('Contract', 'is-token');
  }
  
  async onRelation(r) {
    let addr = r.src_node.relative('is-contract').val;
    let res = await fetch('https://github.com/pancakeswap/token-list/raw/main/src/tokens/cmc.json');
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
          r.dst_node.reportMessage( this.id, 100, 'Token was found in the CoinMarketCap whitelist.' );
        } else {
          r.dst_node.reportMessage( this.id, -100, 'Token attempting to impersonate ' + wt.name + ' but contract address is incorrect' );
        }
      } else if (wt.name == name) {
        match = true;
        r.dst_node.reportMessage( this.id, -50, 'Token attempting to impersonate ' + wt.name + ' but symbol is incorrect' );
      }

    }
    
    if (!match) {
      r.dst_node.reportMessage( this.id, 0, 'Token was not found in CMC whitelist.' );
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
      this.cs.createNode('BlockchainAddress', asset.toLowerCase());
      this.cs.createNode('BlockchainAddress', base.toLowerCase());
              
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

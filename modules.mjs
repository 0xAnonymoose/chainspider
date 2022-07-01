import { Inspector } from './chainspider.mjs';
import web3 from './blockchain.mjs';
import { bep20, pancakeLP } from './lib/abi.mjs';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

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
      r.dst_node.reportMessage( this.id, 0, 'Token '+name+' was not found in CMC whitelist.' );
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
    
    let url = 'https://bscscan.com/token/tokenholderchart/'+addr+'?range='+this.top;
    
    let res = await fetch(url);
    let doc = cheerio.load(await res.text());
    
    doc('#ContentPlaceHolder1_resultrows table tbody tr').each( (idx, row) => {
      let h = [];

      for (let i=0; i<row.children.length; i++) {
        if (row.children[i].name == 'td') {
          let cell = row.children[i].children[0];
          if (cell.type != 'text') { 
            let subanchor = doc(cell).find('a');
            let a = subanchor.get(0);
            
            let caption = subanchor.text();
            let url = a.attribs.href;
           
            let addr = url.substring( url.indexOf('?a=')+3 );
            
            h.push(addr);
            h.push(caption);

          } else {
            h.push(cell.data);
          }
        }
      }
      
      if (h.length == 5) {
        let [idx, addr, caption, tokens, pct] = h;
        
        let n = this.cs.createNode('BlockchainAddress', addr);
        this.cs.createRelation(n, 'holder', r.dst_node);
      }

    });
    
  }
  
}

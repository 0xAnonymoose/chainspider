import { Inspector } from '../chainspider.mjs';
import fetch from 'cross-fetch';

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

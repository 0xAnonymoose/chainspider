import { Inspector } from '../chainspider.mjs';
import fetch from 'cross-fetch';

function proxyUrl(url) {
  return 'https://corsproxy.io/?' + encodeURI(url);
}

export class WhitelistChecker extends Inspector {
  constructor(cs) { 
    super(cs, 'WhitelistChecker');
    this.subscribe('Contract', 'is-token');
    this.panel('WhitelistedToken', this.panelWhitelist.bind(this));
  }
  
  async onRelation(r) {
    let addr = r.src_node.relative('is-contract').val;
    let tokens;
    try { 
      let res = await fetch(proxyUrl('https://github.com/pancakeswap/token-list/raw/main/src/tokens/cmc.json'));
      tokens = await res.json();
    } catch(e) {
      console.error('Failed to load whitelist', e);
      return;
    }
    
    let { symbol, name } = r.dst_node.val;
    let match = false;
    console.log(name);
    for (let wt of tokens) {
      let wtaddr = wt.address.toLowerCase();
      let w;
      
      if (wt.name == name && wt.symbol == symbol) {
        if (wtaddr == addr) {
          w = this.cs.createNode( 'WhitelistedToken', { 'status': 'found', 'platform': 'cmc', 'logoURI': wt.logoURI, symbol, name });
          this.cs.reportMessage( this.id, addr, 100, this.cs.banana.i18n('chainspider-whitelist-found', name, 'cmc') , w );
        } else {
          w = this.cs.createNode( 'WhitelistedToken', { 'status': 'fake', 'platform': 'cmc', 'fake': wt.name, symbol, name });
          this.cs.reportMessage( this.id, addr, -100, this.cs.banana.i18n('chainspider-whitelist-fake-addr', wt.name), w );
        }
      } else if (wt.name == name) {
        w = this.cs.createNode( 'WhitelistedToken', { 'status': 'fake', 'platform': 'cmc', 'fake': wt.symbol, symbol, name });
        this.cs.reportMessage( this.id, addr, -50, this.cs.banana.i18n('chainspider-whitelist-fake-symbol', wt.name), w );
      }
      
      if (w) {
        this.cs.createRelation( r.dst_node, 'whitelist-lookup', w );
        match = true;
      }
    }
    
    if (!match) {
      let w = this.cs.createNode( 'WhitelistedToken', { 'status': 'not-found', 'platform': 'cmc', symbol, name });
      this.cs.reportMessage( this.id, addr, -5, this.cs.banana.i18n('chainspider-whitelist-not-found', name, 'cmc'), w );
      this.cs.createRelation( r.dst_node, 'whitelist-lookup', w );
    }
    
  }

  panelWhitelist(node) {
    if (node.val.status == 'found') {
      return `<h2>${this.cs.banana.i18n('chainspider-whitelist-found', node.val.name, 'cmc')}</h2><img src=${node.val.logoURI}>`;
    } else if (node.val.status == 'not-found') {
      return `<h2>${this.cs.banana.i18n('chainspider-whitelist-not-found', node.val.name, 'cmc')}</h2>`;
    } else if (node.val.status == 'fake') {
      return `<h2>${this.cs.banana.i18n('chainspider-whitelist-fake', node.val.name, node.val.fake)}</h2>`
    }
  }
  
  static getStyles() {
    return [{
		  selector: 'node[type="WhitelistedToken"][status="found"]',
		  style: {
		    'height': 64,
		    'width': 64,
		    'shape': 'round-rectangle',
		    'border-width': '1px',
		    'border-color': 'green',		    
		    'background-image': 'data(logoURI)',
		    'background-fit': 'contain',
		    'background-color': 'white'
		  }
	    },
	    {
	          selector: 'node[type="WhitelistedToken"][status="not-found"]',
		  style: {
		    'height': 32,
		    'width': 32,
		    'shape': 'round-rectangle',
		    'border-width': '1px',
		    'border-color': 'black',
		    'background-image': require('../icons/notfound.png'),
		    'background-color': 'white'
		  }
	    },
	    {
	          selector: 'node[type="WhitelistedToken"][status="fake"]',
		  style: {
		    'height': 32,
		    'width': 32,
		    'shape': 'round-rectangle',
		    'border-width': '1px',
		    'border-color': 'red',
		    'background-image': require('../icons/error.png'),
		    'background-color': 'white'
		  }
	    }
	    ];    
  }
  
}

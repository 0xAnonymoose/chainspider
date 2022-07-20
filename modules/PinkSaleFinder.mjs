import { Inspector } from '../chainspider.mjs';
import fetch from 'cross-fetch';

function proxyUrl(url) {
  return 'https://corsproxy.io/?' + encodeURI(url);
}

export class PinkSaleFinder extends Inspector {

  constructor(cs) { 
    super(cs, 'PinkSaleFinder');
      
    this.subscribe('Contract', 'is-token');
    this.subscribe('InitialOffering', '#Details at PinkSale');
    
    this.panel('InitialOffering', this.panelInitialOffering.bind(this) );
  }
  
  async onRelation(r) {
    if (r.src_node.type == 'InitialOffering') {
      window.open( r.src_node.val.url );
      return;
    }
    
    let { addr } = r.src_node.val;
    let url = 'https://api.pinksale.finance/api/v1/pool/search?chain_id=56&qs='+addr+'&page=1';
    
    let data;
    try {
      let res = await fetch(proxyUrl(url));
      data = await res.json();
    } catch(e) {
      console.error(this.id,'error',e);
      return;
    }
    
    if (data.docs.length > 0) {
      let { token, poolAddress, pool } = data.docs[0];
      
      console.log( token, poolAddress, pool);
      let presaleUrl = 'https://www.pinksale.finance/launchpad/'+poolAddress+'?chain=BSC'
      
      let w = this.cs.createNode( 'InitialOffering', { 'platform': 'PinkSale', token, pool, 'url': presaleUrl });
      this.cs.createRelation( r.dst_node, 'ico', w);
      this.cs.reportMessage( this.id, addr, 10, this.cs.banana.i18n('chainspider-pinksale-found', token.name), w );
    }
    
    
  }

  panelInitialOffering(node) {
    return `
    <h2>${this.cs.banana.i18n('chainspider-pinksale-found', node.val.token.name, 'cmc')}</h2>
    <p>Soft Cap: ${node.val.pool.formattedSoftCap} BNB
    <p>Hard Cap: ${node.val.pool.formattedHardCap} BNB
    <p>Price: ${node.val.pool.formattedRate} ${node.val.token.symbol}/BNB
    `;
  }
  
  static getStyles() {
    return [{
		  selector: 'node[type="InitialOffering"]',
		  style: {
		    'height': 32,
		    'width': 32,
		    'shape': 'round-rectangle',
		    'border-width': '1px',
		    'border-color': 'green',		    
		    'background-image': require('../icons/pinksale.png'),
		    'background-fit': 'contain',
		    'background-color': 'white'
		  }
	    }];
  } 
}

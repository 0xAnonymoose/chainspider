import { Inspector } from '../chainspider.mjs';
import fetch from 'cross-fetch';

export class TopHoldersFinder extends Inspector {
  constructor(cs, doSubscribe = true) { 
    super(cs, 'TopHoldersFinder');
    
    this.top = 25;
    
    this.auto_expand = true;
    this.auto_expand_exclude = [ 
      '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',  // WBNB
      '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82',  // CAKE
      '0xe9e7cea3dedca5984780bafc599bd69add087d56'   // BUSD
    ];
    
    this.subscribe('TokenBEP20', '#Expand Top Holders');
  }


  async onRelation(r) {
    let addr = r.src_node.relative('is-token').relative('is-contract').val;
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
        this.cs.createRelation(n, 'holder', r.src_node);
        
        //await new Promise(resolve => setTimeout(resolve, ANIMATE_DELAY));
    }
    
    this.cs.createEvent( r.src_node, '@holders-expanded' );
    
  }

  static getStyles() {
    return [{
	  selector: 'edge[relation="holder"]',
	  style: {
	    'curve-style': 'bezier',
	    'line-color': 'green',
	    "target-arrow-shape": "square"
	  }
    }]
  }  
}

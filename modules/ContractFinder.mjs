import { Inspector, Relation } from '../chainspider.mjs';
import web3 from '../blockchain.mjs';
import fetch from 'cross-fetch';

/*
ContractFinder checks if any new BlockchainAddress is a Contract.
*/

export class ContractFinder extends Inspector {
  constructor(cs) { 
    super(cs, 'ContractFinder');
    this.subscribe('BlockchainAddress', '@on-create');
  }
  
  async onRelation(r) {
    let addr = r.src_node.val;
    let code = await web3.eth.getCode( addr );
    let source = null;
    let filenames = null;
    
    if (code != '0x') {    
      let data = null;
      
      try {
         let r = await fetch('https://api.bscscan.com/api?module=contract&action=getsourcecode&address='+addr);
         data = await r.json();
         source = data.result[0].SourceCode;
      } catch(e) {
         if(data) { source = data.message; }
      }
              
      let c = this.cs.createNode('Contract', { addr, code, source } );
      this.cs.createRelation(r.src_node, 'is-contract', c);

      if (source == null) {
        this.cs.reportMessage(this.id, addr, -5, 'Failed to get solidity code from BSCScan', c);
      }
    }
    
  }

  static getStyles() {
    return [
	{
	  selector: 'node[type="Contract"]',
	  style: {
	    'height': 20,
	    'width': 20,
	    'shape': 'square',		    
	    'background-color': 'blue',
	    'content': 'C',
	    'text-valign': 'center'
	  }
	},
        {
	  selector: 'edge[relation="is-contract"]',
	  style: {
	    'curve-style': 'bezier',
	    'line-color': 'blue',
	    "target-arrow-shape": "circle"
	  }
	}
    ];
  }
  
}

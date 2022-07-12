import { Inspector, Relation } from '../chainspider.mjs';
import web3 from '../blockchain.mjs';

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
    
    if (code != '0x') {
      let c = this.cs.createNode('Contract', { code, source } );
      this.cs.createRelation(r.src_node, 'is-contract', c);
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
	    'content': 'Contract'
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

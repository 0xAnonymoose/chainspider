import { Inspector } from '../chainspider.mjs';
import { bep20 } from '../lib/abi.mjs';
import web3 from '../blockchain.mjs';

export class TopHoldersChecker extends Inspector {
  constructor(cs) { 
    super(cs, 'TopHoldersChecker');
        
    this.subscribe('TokenBEP20', '@holders-expanded');
    this.panel('TopHoldersReport', TopHoldersChecker.panelTopHolders);
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
        this.cs.reportMessage(this.id, addr, -100, 'Token holder '+holder+' has '+ratio.toFixed(0)+'% of supply.');
      } else if (ratio > 33.0) {
        this.cs.reportMessage(this.id, addr, -25, 'Token holder '+holder+' has over 33% of supply.');
      }
    }
    
    this.cs.createRelation(r.src_node, 'top-holders', this.cs.createNode('TopHoldersReport', report));
  }
  
  static panelTopHolders(node) {
    let s = '<table><tr><td>Addr<td><td>Balance</td></tr>';
    for (let addr of Object.keys(node.val.balances)) {
      s += `<tr><td>${addr}</td><td>${node.val.balances[addr]}</td></tr>`;
    }    
    s += '</table>';
    return s;
  }
  
  static getStyles() {
    return [{
		  selector: 'node[type="TopHoldersReport"]',
		  style: {
		    'height': 64,
		    'width': 64,
		    'shape': 'round-rectangle',		    
		    'background-image': require('/icons/report.png')
		  }
	   }]
  }
  
}

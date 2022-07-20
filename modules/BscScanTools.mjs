import { Inspector } from '../chainspider.mjs';

export class BscScanTools extends Inspector {

  constructor(cs, doSubscribe = true) { 
    super(cs, 'BscScanTools');
      
    this.subscribe('BlockchainAddress', '#Show in BSCScan');
    this.subscribe('TokenBEP20', '#Show in BSCScan');
    this.subscribe('Contract', '#Show in BSCScan');
  }
  
  onRelation(r) {
    let url = '/address/';
    let addr = r.src_node.val;
    let tail = '';
    
    if (r.src_node.type == "TokenBEP20") { 
      url = '/token/';
      addr = r.src_node.val.addr;
      tail = '#balances';
    }
    if (r.src_node.type == "Contract") {
      tail = '#code';
      addr = r.src_node.val.addr;
    }
    
    window.open('https://www.bscscan.com'+url+addr+tail);
  }

}

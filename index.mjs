import { Node, ChainSpider } from './chainspider.mjs';

class ContractFinder extends Inspector {
  constructor(cs) { 
    super(cs, 'ContractFinder');
    this.subscribe('BlockchainAddress', '@on-create');
  }
  
  onRelation(r) {  console.log(this.id, 'base onRelation', r);  }
  
}


class TokenFinder extends Inspector {
  constructor(cs) { 
    super(cs, 'ContractFinder');
    this.subscribe('BlockchainAddress', 'is-contract');
  }
  
  onRelation(r) {  console.log(this.id, 'base onRelation', r);  }
  
}

let cs = new ChainSpider();

new ContractFinder(cs);
new TokenFinder(cs);

cs.createNode('BlockchainAddress', 'test');


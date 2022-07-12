import { Inspector } from '../chainspider.mjs';
import { pancakeFactory } from '../lib/abi.mjs';
import web3 from '../blockchain.mjs';

export class LPFactoryFinder extends Inspector {
  constructor(cs) { 
    super(cs, 'LPFactoryFinder');
    
    this.auto_expand = true;
    this.base_pairs = [ 
      '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',  // WBNB
      '0xe9e7cea3dedca5984780bafc599bd69add087d56'   // BUSD
    ];
    
    this.factories = {
      'PancakeSwap': '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
      'BabySwap': '0x86407bEa2078ea5f5EB5A52B2caA963bC1F889Da',
      'ApeSwap': '0x0841BD0B734E4F5853f0dD8d7Ea041c241fb0Da6',
      'BiSwap': '0x858E3312ed3A876947EA49d572A7C42DE08af7EE'
    }
    
    this.abis = {}
    
    this.subscribe('Contract', 'is-token');
  }
  
  async onRelation(r) {
    let addr = r.src_node.relative('is-contract').val;
    if (this.base_pairs.indexOf(addr) > -1 || !this.auto_expand) { return; }
    
    for (let factory of Object.keys(this.factories)) {
      let faddr = this.factories[factory];
      if (!this.abis[factory]) {
        this.abis[factory] = await new web3.eth.Contract( pancakeFactory, faddr );
      }
      
      console.log('Checking', factory);
      for (let base of this.base_pairs) {
        let candidate = await this.abis[factory].methods.getPair( addr, base ).call();
        console.log(addr, base, candidate);
        if (candidate != '0x0000000000000000000000000000000000000000') {
          this.cs.createNode( 'BlockchainAddress', candidate.toLowerCase() );
        }
      }
    }

  } 

}

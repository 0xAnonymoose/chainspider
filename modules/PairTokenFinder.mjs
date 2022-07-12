import { Inspector } from '../chainspider.mjs';

export class PairTokenFinder extends Inspector {
  constructor(cs) { 
    super(cs, 'PairTokenFinder');
    this.subscribe('Contract', 'is-token');
  }
  
  async onRelation(r) {
    let token_addr = r.src_node.relative('is-contract');
    
    let amms = this.cs.nodes.filter( (x)=> { return x.type == 'TokenAMM'; } );
    for (let amm of amms) {
      //console.log(this.id, token, amm);
      if (amm.val.base == token_addr.val) {
        this.cs.createRelation( r.dst_node, 'trades-on', amm );
      }
      if (amm.val.asset == token_addr.val) {
        this.cs.createRelation( r.dst_node, 'bases', amm );
      }
    }
  }
}

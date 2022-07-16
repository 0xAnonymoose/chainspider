import { Inspector } from '../chainspider.mjs';
import { pancakeLP, bep20 } from '../lib/abi.mjs';
import web3 from '../blockchain.mjs';

export class LPChecker extends Inspector {

  constructor(cs) { 
    super(cs, 'LPChecker');
    
    this.amount = 10000000000000;
    this.subscribe('Contract', 'is-amm');
  }

  async onRelation(r) {
    let { asset, base_name, asset_reserve, base_reserve, asset_is_zero } = r.dst_node.val;

    let addr = r.src_node.relative('is-contract').val;   
    const asset_abi = await new web3.eth.Contract( bep20, asset );    
    
    let assetSupply = await asset_abi.methods.totalSupply().call();
    let assetDecimals = await asset_abi.methods.decimals().call();
    let assetTotal = parseFloat(BigInt(assetSupply) / BigInt(10**(assetDecimals-3)))/1000.0;

    let asset_ratio = asset_reserve/ assetTotal;
    
    console.log(asset_ratio, base_name, base_reserve);
    
    if (asset_ratio > 100.0) {
      this.cs.reportMessage(this.id, asset, -100, r.dst_node.val.name+' has '+asset_ratio.toFixed(0)+'% of asset supply, has likely been rugged.', r.dst_node);
    }
        
    if ( (base_name == 'WBNB' && base_reserve < 5) || (base_name == 'BUSD' && base_reserve < 1000) ) {
      this.cs.reportMessage(this.id, asset, -10, r.dst_node.val.name+' has very low liquidity, do not trade with it.', r.dst_node);
    }
    
    //console.log(this.id, assetReserve, baseReserve, assetSupply, asset_ratio);
    
  }
}

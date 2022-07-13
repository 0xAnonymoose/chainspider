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
    let { asset, base, asset_is_zero } = r.dst_node.val;

    let base_abi = await new web3.eth.Contract( bep20, base );
    let asset_abi = await new web3.eth.Contract( bep20, asset );

    let addr = r.src_node.relative('is-contract').val;
       
    let liquidityPair = await new web3.eth.Contract( pancakeLP, addr );
    let reserves = await liquidityPair.methods.getReserves().call();
    
    //console.log(reserves);
    let assetReserve = reserves[asset_is_zero?0:1];
    let baseReserve = reserves[asset_is_zero?1:0];
    
    let assetSupply = await asset_abi.methods.totalSupply().call();
    
    let asset_ratio_1e3 = BigInt(1000) * BigInt(assetReserve) / BigInt(assetSupply);
    let asset_ratio = parseFloat(asset_ratio_1e3.toString())/10.0;
    
    if (asset_ratio > 100.0) {
      this.cs.reportMessage(this.id, asset, -100, r.dst_node.val.name+' has '+asset_ratio.toFixed(0)+'% of asset supply, has likely been rugged.');
    }
    
    let baseBNB_1e3 = BigInt(baseReserve) / BigInt(10**15);
    let baseBNB = parseFloat(baseBNB_1e3.toString()) / 1000.0;
    console.log(baseBNB);
    
    if (baseBNB < 1) {
      this.cs.reportMessage(this.id, asset, -100, r.dst_node.val.name+' has very low liquidity, has likely been rugged.');
    }
    
    //console.log(this.id, assetReserve, baseReserve, assetSupply, asset_ratio);
    
  }
}

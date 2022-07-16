import { Inspector } from '../chainspider.mjs';
import { bep20, pancakeLP } from '../lib/abi.mjs';
import web3 from '../blockchain.mjs';

export class TokenFinder extends Inspector {
  constructor(cs) { 
    super(cs, 'TokenFinder');
    
    this.base_pairs = [ 
      '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',  // WBNB
      '0xe9e7cea3dedca5984780bafc599bd69add087d56'   // BUSD
    ];
    
    this.expand_base = false;
    
    this.subscribe('BlockchainAddress', 'is-contract');
    this.panel('TokenBEP20', TokenFinder.panelBEP20);
    this.panel('TokenAMM', TokenFinder.panelAMM);
  }
  
  async onRelation(r) {
    let addr = r.src_node.val;  
    const token_abi = await new web3.eth.Contract( bep20, addr );
    const lp_abi = await new web3.eth.Contract( pancakeLP, addr );
    
    let symbol;
    try {
      symbol = await token_abi.methods.symbol().call();
    } catch(err) {
      console.error(this.id, 'error', err);
      return;
    }
    
    function bigToFloat(x,d=18) { return parseFloat(BigInt(x) / BigInt(10**(d-3)))/1000; }
    
    let is_amm = false;
    let reserves;
    try {
       reserves = await lp_abi.methods.getReserves().call();
       is_amm = true;
    } catch(err) {
       if (err.message != 'Returned error: execution reverted' && err.message != "Returned values aren't valid, did it run Out of Gas? You might also see this error if you are not using the correct ABI for the contract you are retrieving data from, requesting data from a block number that does not exist, or querying a node which is not fully synced.") {
         console.error(err.message);
         return;
       }
    }
    
    if (is_amm) {
      let asset;
      let base;
      try {
        asset = await lp_abi.methods.token0().call();
        base = await lp_abi.methods.token1().call();
      } catch(err) {
        console.error(this.id, 'error', err);
        return;
      }

      let asset_name;
      let base_name;
      let asset_is_zero = true;
      
      // Is this a backwards LP (where the base is reserves[1])?
      if (this.base_pairs.indexOf(asset.toLowerCase()) > -1) {
        asset_is_zero = false;
        let tmp = asset;
        asset = base;
        base = tmp;
      }
      
      let asset_reserve;
      let base_reserve;
      
      try {
        const asset_abi = await new web3.eth.Contract( bep20, asset );
        const base_abi = await new web3.eth.Contract( bep20, base );
        
        asset_name = await asset_abi.methods.symbol().call();
        base_name = await base_abi.methods.symbol().call();
        
        asset_reserve = bigToFloat(reserves[asset_is_zero?0:1], await asset_abi.methods.decimals().call());
        base_reserve = bigToFloat(reserves[asset_is_zero?1:0], await base_abi.methods.decimals().call());
        
      } catch(err) {
        console.error(this.id, 'error', err);
        return;
      }
      
      let name = asset_name+'/'+base_name+'\n'+symbol;
      let t = this.cs.createNode('TokenAMM', { asset: asset.toLowerCase(), base: base.toLowerCase(), name, asset_name, base_name, asset_reserve, base_reserve, asset_is_zero });
      this.cs.createRelation(r.dst_node, 'is-amm', t);
      
      let a = this.cs.createNode('BlockchainAddress', asset.toLowerCase());     
      if (a.relative('is-contract') && a.relative('is-contract').relative('is-token')) {
        this.cs.createRelation( a.relative('is-contract').relative('is-token'), 'trades-on', t );
      }
      
      if (this.expand_base) {
        let b = this.cs.createNode('BlockchainAddress', base.toLowerCase());      
        if (b.relative('is-contract') && b.relative('is-contract').relative('is-token')) {
          this.cs.createRelation( b.relative('is-contract').relative('is-token'), 'bases', t );
        }
      }
      
      return;
    }
    
    let info;
    try {
      info = {
        //contractAddress: addr,
        totalSupply: await token_abi.methods.totalSupply().call(),
        symbol,
        name: await token_abi.methods.name().call(),
        decimals: await token_abi.methods.decimals().call()
      }
    } catch(err) {
      console.error(this.id, 'error', err);
      return;
    }

    let t = this.cs.createNode('TokenBEP20', info);
    this.cs.createRelation(r.dst_node, 'is-token', t);    
  }
  
  static panelBEP20(node) {
    return `${node.val.name} (${node.val.symbol})<br>Supply: ${node.val.totalSupply}<br><input type=button value="Expand Top Holders" onClick=" window.expandTopHolders(${node._id}); ">`
  }
  
  static panelAMM(node) {
    return `<h2>${node.val.name}</h2>Asset: ${node.val.asset_reserve} ${node.val.asset_name}<br>Base: ${node.val.base_reserve} ${node.val.base_name}`;
  }  

  static getStyles() {
    return [
		{
		  selector: 'node[type="TokenBEP20"]',
		  style: {
		    'height': 32,
		    'width': 32,
		    'shape': 'round-rectangle',		    
		    'background-color': 'green',
		    'content': 'data(name)',
		    'text-valign': 'center',
		    'font-size': '0.5em',
		    'color': '#222244'
		  }
		},    
    		{
		  selector: 'node[type="TokenAMM"]',
		  style: {
		    'height': 32,
		    'width': 32,
		    'shape': 'round-rectangle',		    
		    'background-color': 'purple',
		    'content': 'data(name)',
		    'text-wrap': 'wrap',
		    'text-valign': 'center',
		    'color': '#222244',
		    'font-size': '0.5em'
		  }
		},
                {
		  selector: 'edge[relation="trades-on"]',
		  style: {
		    'curve-style': 'bezier',
		    'line-color': 'purple',
		    "target-arrow-shape": "circle"
		  }
		},
                {
		  selector: 'edge[relation="bases"]',
		  style: {
		    'curve-style': 'bezier',
		    'line-color': 'purple',
		    "target-arrow-shape": "circle"
		  }
		}		
    ]
  }
  
}

import { Inspector } from '../chainspider.mjs';
import fetch from 'cross-fetch';

export class LP1inchFinder extends Inspector {
  constructor(cs) { 
    super(cs, 'LP1inchFinder');

    this.auto_expand = true;
    this.auto_expand_exclude = [ 
      '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',  // WBNB
      '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82',  // CAKE
      '0xe9e7cea3dedca5984780bafc599bd69add087d56'   // BUSD
    ];
    
    this.amount = 10000000000000;
    this.subscribe('Contract', 'is-token');
  }
  
  async onRelation(r) {
    let addr = r.src_node.relative('is-contract').val;
    if (this.auto_expand_exclude.indexOf(addr) > -1 || !this.auto_expand) { return; }

    let url = 'https://pathfinder.1inch.io/v1.2/chain/56/router/v4/quotes?deepLevel=2&mainRouteParts=10&parts=50&virtualParts=50&walletAddress=null&fromTokenAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'+'&toTokenAddress='+addr+'&amount='+this.amount+ "&gasPrice=20000000000&protocolWhiteList=BURGERSWAP,PANCAKESWAP,VENUS,JULSWAP,BAKERYSWAP,BSC_ONE_INCH_LP,ACRYPTOS,BSC_DODO,APESWAP,SPARTAN,SPARTAN_V2,VSWAP,VPEGSWAP,HYPERSWAP,BSC_DODO_V2,SWAPSWIPE,ELLIPSIS_FINANCE,BSC_NERVE,BSC_SMOOTHY_FINANCE,CHEESESWAP,BSC_PMM1,PANCAKESWAP_V2,MDEX,WARDEN,WAULTSWAP,BSC_ONE_INCH_LIMIT_ORDER,BSC_ONE_INCH_LIMIT_ORDER_V2,BSC_PMM3,BSC_PMM7,ACSI_FINANCE,GAMBIT_FINANCE,JETSWAP,BSC_UNIFI,BSC_PMMX,BSC_KYBER_DMM,BSC_BI_SWAP,BSC_DOPPLE,BABYSWAP,BSC_PMM2MM,WOOFI,BSC_ELK,BSC_SYNAPSE,BSC_AUTOSHARK,BSC_CAFE_SWAP,BSC_PMM5,PLANET_FINANCE,BSC_ANNEX_FINANCE,BSC_ANNEX_SWAP,BSC_RADIOSHACK&protocols=BURGERSWAP,PANCAKESWAP,VENUS,JULSWAP,BAKERYSWAP,ACRYPTOS,BSC_DODO,APESWAP,SPARTAN,SPARTAN_V2,VSWAP,VPEGSWAP,HYPERSWAP,BSC_DODO_V2,SWAPSWIPE,ELLIPSIS_FINANCE,BSC_NERVE,BSC_SMOOTHY_FINANCE,CHEESESWAP,PANCAKESWAP_V2,MDEX,WARDEN,WAULTSWAP,ACSI_FINANCE,GAMBIT_FINANCE,JETSWAP,BSC_UNIFI,BSC_KYBER_DMM,BSC_BI_SWAP,BSC_DOPPLE,BABYSWAP,WOOFI,BSC_ELK,BSC_SYNAPSE,BSC_AUTOSHARK,BSC_CAFE_SWAP,PLANET_FINANCE,BSC_ANNEX_FINANCE,BSC_ANNEX_SWAP,BSC_RADIOSHACK&deepLevels=1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1&mainRoutePartsList=1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1&partsList=1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1&virtualPartsList=1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1";

    let d = await fetch(url);
    let j = await d.json();
    let markets = [];
    
    if (!j.results) {
      console.error('1inch API failed');
      return;
    }
   
    for (let r of j.results) {
      for (let route of r.routes) {
        let sr = route.subRoutes;
        let mkt = sr[0][0].market;
        
        this.cs.createNode( 'BlockchainAddress', mkt.id.toLowerCase() );
      }
    }
    
    console.log(markets);
  } 

}

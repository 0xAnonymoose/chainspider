import { ChainSpider } from './chainspider.mjs';
import { ContractFinder, TokenFinder } from './modules.mjs';

let cs = new ChainSpider();

new ContractFinder(cs);
new TokenFinder(cs);

cs.createNode('BlockchainAddress', '0xa34f2dbab310ab8adba3682dc8978d29ed8a9c7e');


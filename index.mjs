import { ChainSpider } from './chainspider.mjs';
import { ContractFinder, TokenFinder, WhitelistChecker, TopHoldersFinder, TopHoldersChecker } from './modules.mjs';

let cs = new ChainSpider();

new ContractFinder(cs);
new TokenFinder(cs);
new WhitelistChecker(cs);
new TopHoldersFinder(cs);
new TopHoldersChecker(cs);

cs.createNode('BlockchainAddress', '0xa34f2dbab310ab8adba3682dc8978d29ed8a9c7e');
//cs.createNode('BlockchainAddress', '0x7639b99a794cd117cd02412f6be427bdde663d8d');



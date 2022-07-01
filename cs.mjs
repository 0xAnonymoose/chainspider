import { ChainSpider } from './chainspider.mjs';
import { ContractFinder, TokenFinder, WhitelistChecker, TopHoldersFinder, TopHoldersChecker } from './modules.mjs';

const cs = new ChainSpider();

new ContractFinder(cs);
new TokenFinder(cs);
new WhitelistChecker(cs);
//new TopHoldersFinder(cs);
new TopHoldersChecker(cs);

export default cs;

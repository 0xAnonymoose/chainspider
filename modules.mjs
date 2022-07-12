import { ContractFinder} from './modules/ContractFinder.mjs';
import { LPFactoryFinder } from './modules/LPFactoryFinder.mjs';
import { WhitelistChecker } from './modules/WhitelistChecker.mjs';
import { TokenFinder } from './modules/TokenFinder.mjs';
import { TopHoldersFinder } from './modules/TopHoldersFinder.mjs';
import { TopHoldersChecker } from './modules/TopHoldersChecker.mjs';
import { PairTokenFinder } from './modules/PairTokenFinder.mjs';
import { LPChecker } from './modules/LPChecker.mjs';
import { LP1inchFinder } from './modules/LP1inchFinder.mjs';

export function registerModules(cs) {
  new ContractFinder(cs);
  new TokenFinder(cs);
  new WhitelistChecker(cs);
  new TopHoldersChecker(cs);
  new PairTokenFinder(cs);
  new LPChecker(cs);
  
  //new LP1inchFinder(cs);
  new LPFactoryFinder(cs);
  
  let THF = new TopHoldersFinder(cs, false);
  return { THF };
}

export function getAllStyles() {
  return [
   ...ContractFinder.getStyles(),
   ...WhitelistChecker.getStyles(),
   ...TokenFinder.getStyles(),
   ...TopHoldersFinder.getStyles(),
   ...TopHoldersChecker.getStyles()
  ];
}

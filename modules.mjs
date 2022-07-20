import { ContractFinder} from './modules/ContractFinder.mjs';
import { LPFactoryFinder } from './modules/LPFactoryFinder.mjs';
import { WhitelistChecker } from './modules/WhitelistChecker.mjs';
import { TokenFinder } from './modules/TokenFinder.mjs';
import { TopHoldersFinder } from './modules/TopHoldersFinder.mjs';
import { TopHoldersChecker } from './modules/TopHoldersChecker.mjs';
import { PairTokenFinder } from './modules/PairTokenFinder.mjs';
import { LPChecker } from './modules/LPChecker.mjs';
import { LP1inchFinder } from './modules/LP1inchFinder.mjs';
import { MalwareChecker } from './modules/MalwareChecker.mjs';
import { BscScanTools } from './modules/BscScanTools.mjs';

export function registerModules(cs) {
  new ContractFinder(cs);
  new TokenFinder(cs);
  new WhitelistChecker(cs);
  new TopHoldersChecker(cs);
  new PairTokenFinder(cs);
  new LPChecker(cs);
  
  //new LP1inchFinder(cs);
  new LPFactoryFinder(cs);

  new MalwareChecker(cs);

  // actions
  new TopHoldersFinder(cs);
  new BscScanTools(cs);
}

export function getAllStyles() {
  return [
   ...ContractFinder.getStyles(),
   ...WhitelistChecker.getStyles(),
   ...TokenFinder.getStyles(),
   ...TopHoldersFinder.getStyles(),
   ...TopHoldersChecker.getStyles(),
   ...MalwareChecker.getStyles()
  ];
}

import { ChainSpider } from './chainspider.mjs';
import { registerModules } from './modules.mjs';

import Banana from 'banana-i18n';
import lang_en from './i18n/en.json' assert {type: 'json'};
const banana = new Banana('en');
banana.load(lang_en, 'en');

const cs = new ChainSpider(banana);
registerModules(cs);

const addr = process.argv[2] || '0xa34f2dbab310ab8adba3682dc8978d29ed8a9c7e';
cs.createNode('BlockchainAddress', addr.toLowerCase());
//cs.createNode('BlockchainAddress', '0x7639b99a794cd117cd02412f6be427bdde663d8d');



import { ChainSpider } from './chainspider.mjs';
import { registerModules } from './modules.mjs';

class ChainSpiderWeb extends ChainSpider {
  onNode(node) {
    super.onNode(node);
  }
  
  onRelation(relation) {
    super.onRelation(relation);
  }
  
  onMessage(msg) {
    super.onMessage(msg);
    document.getElementById('messages').innerHTML += '<p>'+msg.msg; 
  }
}

const cs = new ChainSpiderWeb();
registerModules(cs);

function onStartClick(e) {
  cs.createNode('BlockchainAddress', document.getElementById('addr').value);
}

document.cs = cs;
document.onStartClick = onStartClick;

import { ChainSpider } from './chainspider.mjs';
import { registerModules } from './modules.mjs';

class ChainSpiderWeb extends ChainSpider {
  onNode(node) {
    super.onNode(node);
    if (node.type == 'TokenBEP20') {
    document.getElementById('messages').innerHTML += '<p>Token is BEP20: '+node.val.name; 
    }
  }
  
  onRelation(relation) {
    super.onRelation(relation);
    if (relation.relation == 'is-whitelisted') {
      document.getElementById('messages').innerHTML += '<p>'+relation.src_node.val.name+' is in the '+relation.dst_node.val.platform+' whitelist!';
      document.getElementById('messages').innerHTML += '<img src='+relation.dst_node.val.logoURI+'>';
    }
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

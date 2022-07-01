import cs from './cs.mjs';

function onStartClick(e) {
  cs.createNode('BlockchainAddress', document.getElementById('addr').value);
}

document.cs = cs;
document.onStartClick = onStartClick;

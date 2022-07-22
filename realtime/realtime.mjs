import Web3 from 'web3';
import { bep20 } from '../lib/abi.mjs';
import xss from 'xss';

let web3;

const PAIR_CREATED = "0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9";
const LP_SYNC = "0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1";

const TOKEN_WBNB = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c';

var last_block_time = Date.now();
var lp_info = {};
var lp_list = [];

function let_pad(v, p=64) { return "0x"+v.substring(2).padStart(64,'0'); }
function left_unpad(v)    { return "0x"+v.substring(2).replace(/^0+/, ''); }
function data_to_uint256(data) {
   let tmp = data.substring(2);
   let a = [];
   for (; tmp.length > 0; tmp = tmp.substring(64)) {
     a.push(left_unpad('0x'+tmp.substring(0,64)));
   }
   return a;
}

async function tokenInfo(addr) {
  let info = { addr };
  
  try {
    const token_abi = await new web3.eth.Contract( bep20, addr );
    info.symbol = xss(await token_abi.methods.symbol().call());
    info.name = xss(await token_abi.methods.name().call());
  } catch(e) {
    console.error('tokeninfo failed', addr);
  }
  
  return info;
}

var txnQueue = [];

function interestingPair(addr) {
  return (lp_list.indexOf(addr) > -1);
}

async function pairCreated(log) { 
  let router = log.address.toLowerCase();
  let asset0 = left_unpad(log.topics[1]).toLowerCase();
  let asset1 = left_unpad(log.topics[2]).toLowerCase();
  let pair = left_unpad(log.data.substring(0,66)).toLowerCase();
  
  if (lp_list.indexOf(pair) > -1) {
    console.log('pairCreated', pair, 'duplicate');
    return;
  }
  
  let r = { state: 0 };
  let info;
  let asset_is_zero = false;
  
  if (asset0 == TOKEN_WBNB) {
    info = await tokenInfo(asset1);
  } else if (asset1 == TOKEN_WBNB) {
    asset_is_zero = true;
    info = await tokenInfo(asset0);
  } else {
    console.log('pairCreated', pair, 'skip because not WBNB based', asset0, asset1);
    return;
  }
    
  if (!info.name) { return; }
  r = {router, pair, asset_is_zero, reserve0: 0, reserve1: 0, bnb_float: null, bnb_rug: null, count: 0, info};
    
  console.log('LP_CREATED', info.name, info.symbol, pair );
  lp_info[pair] = r;
  lp_list.push(pair);
  
  addPanel(pair);
}

async function lpSync(log) {
  let addr = log.address.toLowerCase();
  
  if (!interestingPair(addr)) { return; }
  
  let reserves = data_to_uint256(log.data);
  let reserve0 = BigInt(reserves[0]);
  let reserve1 = BigInt(reserves[1]);
  
  let bnb_bn = lp_info[addr].asset_is_zero ? reserve1 : reserve0;
  let bnb_float = parseFloat((bnb_bn / BigInt(10**15)).toString())/1000.0;
  
  let asset_last;
  let asset_now;
  let bnb_last;
  let bnb_now;
  
  if (lp_info[addr].asset_is_zero) {
    asset_last = lp_info[addr].reserve0;
    asset_now = reserve0;    
    bnb_last = lp_info[addr].reserve1;
    bnb_now = reserve1;
  } else {
    asset_last = lp_info[addr].reserve1;
    asset_now = reserve1;    
    bnb_last = lp_info[addr].reserve0;
    bnb_now = reserve0;  
  }
  
  let txnType = '';
  if (asset_now > asset_last && bnb_now > bnb_last) {
     txnType = 'ADDLIQ';
  } else if ( asset_now > asset_last && bnb_now < bnb_last) {
     txnType = 'SELL';
  } else if ( asset_now < asset_last && bnb_now > bnb_last) {
     txnType = 'BUY';
  } else if ( asset_now < asset_last && bnb_now < bnb_last) {
     txnType = 'RMLIQ';
  }
  
  let isRug = false;
  if (txnType == 'SELL' || txnType == 'RMLIQ') {
     removedRatio = BigInt(100)*bnb_now/bnb_last;
     if (removedRatio < 10) {
       isRug = true;
       lp_info[addr].bnb_rug = (lp_info[addr].bnb_rug||0) + lp_info[addr].bnb_float - bnb_float;
       console.log('** RUG **', lp_info[addr].info.name, removedRatio, 'Rugged BNB:', lp_info[addr].bnb_rug);
     }
  }
  
  console.log('LP_SYNC', lp_info[addr].info.name, txnType, reserve0.toString(), reserve1.toString(), 'BNB:', bnb_float.toFixed(4) );
  
  lp_info[addr].reserve0 = reserve0;
  lp_info[addr].reserve1 = reserve1;
  lp_info[addr].bnb_float = bnb_float;
  lp_info[addr].count++;

  //console.log('lpSync', addr, reserves);
  updatePanel(addr);
}

function topicRouter(error, log) {
  if (error) {
    console.error(error);
    return;
  }
  
  let addr = log.address.toLowerCase();
  
  if (log.topics[0] == PAIR_CREATED || interestingPair(addr)) {
     if (txnQueue.indexOf(log.transactionHash) == -1) {
       txnQueue.push( log.transactionHash );
     }
  }
}

function addPanel(addr) {
  let panel = document.createElement('div');
  panel.id = 'p'+addr;
  panel.classList.add('panel');
  
  document.getElementById('main').appendChild( panel );
  lp_info[addr].state = 0;
  updatePanel(addr);
  
  setTimeout( ()=>{ panel.style.opacity = 1 }, 500 );
}

function closePanel(addr) {
  let panel = document.getElementById('p'+addr);
  document.getElementById('main').removeChild(panel);
}
window.closePanel = closePanel;

function updatePanel(addr) {
  let panel = document.getElementById('p'+addr);
  if (!panel) { return; }
  
  let s = `<a href="#" onClick="closePanel('${addr}');" class='closer'>[X]</a> <div class='token'>${lp_info[addr].info.name} (${lp_info[addr].info.symbol})</div>`;
  if (lp_info[addr].count == 0) {
    s += '<br>NO LIQUDITY';
  } else if (lp_info[addr].bnb_rug) {
    s += `<br>RUGGED ${lp_info[addr].bnb_rug} BNB`;
  } else {
    s += `<br>${lp_info[addr].count} transactions / ${lp_info[addr].bnb_float} BNB`;
  }
  panel.innerHTML = s;
  
  if (lp_info[addr].state > 0) {
    panel.style.color = '#0077ff';
    setTimeout( ()=>{ panel.style.color = '#000000'; }, 2000 );
  }
  
  if (lp_info[addr].state == 0 && lp_info[addr].count > 0) {
    lp_info[addr].state = 1;
    panel.style.backgroundColor = '#cceecc';
  }
  if (lp_info[addr].state != 2 && lp_info[addr].bnb_rug) {
    lp_info[addr].state = 2;
    panel.style.backgroundColor = '#ee8888';  
  } 

}

async function run() {

web3 = new Web3("https://bsc-dataseed1.binance.org");

let currentBlock = await web3.eth.getBlockNumber();
let firstBlock = currentBlock-128;

poll(firstBlock);
}

lastBlock = null;
async function poll(block) {

  let fromBlock = (block || lastBlock)+1;
  let req = { topics: [[PAIR_CREATED,LP_SYNC]], fromBlock };
  
  let logs = await web3.eth.getPastLogs(req);
  let txnDone = [];
  
  for (let log of logs) {
     let addr = log.address.toLowerCase();
  
     if (log.topics[0] == PAIR_CREATED || interestingPair(addr)) {
       if (txnDone.indexOf(log.transactionHash) == -1) {
          txnDone.push(log.transactionHash);

          let txn = await web3.eth.getTransactionReceipt(log.transactionHash);
          for (let log of txn.logs) {
             if (log.topics[0] == PAIR_CREATED) { await pairCreated(log); }
             if (log.topics[0] == LP_SYNC)      { await lpSync(log); }
          }
       }
     }
     
     if (log.blockNumber > lastBlock) {
       lastBlock = log.blockNumber;
       document.getElementById('block').innerHTML = lastBlock;
     }
  }
  
  console.log('Done', fromBlock, '-', lastBlock, 'logs:', logs.length, 'txns:', txnDone.length );
  
  setTimeout(poll, 5000);
}

run();

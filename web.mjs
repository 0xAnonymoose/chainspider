import { ChainSpider, Relation } from './chainspider.mjs';
import { registerModules, getAllStyles } from './modules.mjs';
import klay  from 'cytoscape-klay';

function proxyUrl(url) {
  return 'https://corsproxy.io/?' + encodeURI(url);
}

class ChainSpiderWeb extends ChainSpider {
  constructor() {
    super();
    
    this.animq = [];
    this.animating = false;
    
    this.score = 0;
  }
  
  pushChange(x) {
    if (x) {
      // adding new element
      if (this.animating) { 
        //console.log('Animation queued');
        this.animq.push(x);
        return;
      }
    } else {
      if (this.animq.length == 0) {
        //console.log('Animations done!');
        this.animating = false;
        return;
      } else {
        //console.log('Animation continues');
        x = this.animq.shift();
        // if an edge follows a node, grab them both at once to skip animations we dont need.
        if (x.group == 'nodes' && this.animq.length > 0 && this.animq[0].group == 'edges') {
          window.cy.add(x);
          x = this.animq.shift();
        }
      }
    }
    
    //console.log('Animating', x);
    this.animating = true;
    window.cy.add(x);
    window.updateLayout( this.pushChange.bind(this) );
  }
  
  onNode(node) {
    super.onNode(node);
       
    let data = { id: 'n'+node._id, type: node.type, name: node.toString(), raw: node };
    if (typeof node.val == 'string') { data.name = node.val; } else { data = {...data, ...node.val}; }
    if (data.logoURI) { data.logoURI = proxyUrl(data.logoURI); }
    
    this.pushChange( { group: 'nodes', data } );
    //window.updateLayout();
    
    if (node.type == 'TokenBEP20') {
      //document.getElementById('messages').innerHTML += '<p>BEP20 detected '+node.val.name; 
    }

  }
  
  onRelation(relation) {
    super.onRelation(relation);
    
    // event?
    if (relation.dst_node != true) {
      this.pushChange( { group: 'edges', data: { id: 'e'+relation._id, source: 'n'+relation.src_node._id, target: 'n'+relation.dst_node._id, relation: relation.relation } } );
      //window.updateLayout();
    }
    
    if (relation.relation == 'is-whitelisted') {
      //document.getElementById('messages').innerHTML += '<p>'+relation.src_node.val.name+' is in the '+relation.dst_node.val.platform+' whitelist!';
      //document.getElementById('messages').innerHTML += '<img src='+relation.dst_node.val.logoURI+'>';
    }

  }
  
  onMessage(msg) {
    super.onMessage(msg);
    let contextAddr = document.getElementById('addr').value;
    let s = '';
    let score = 0;
    
    for (let msg of this.messages) {
  
      if (msg.topic != contextAddr) { continue; }
    
      let color = 'black';
      if (msg.score < 0) { color = 'red'; }
      if (msg.score > 0) { color = 'green'; }
    
      s += '<p style="color: '+color+'"> ';
      if (msg.node) { s+= `<a href=# onClick="moveContext(${msg.node._id})">`; }
      s += msg.msg; 
      if (msg.node) { s+= '</a>'; }
    
      score += msg.score;
    }
    
    let scolor = 'black';
    let snote = '';
    if (score <= -100) { snote='SCAM'; scolor='red'; }
    if (score >= 100) { snote='OK!'; scolor='green'; }
    s += '<h3 style="color: '+scolor+'">Score '+score+" "+snote+'</h3>'
    
    document.getElementById('messages').innerHTML = s;
  }
}

document.addEventListener('DOMContentLoaded', function(){
       
	var cy = window.cy = cytoscape({
		container: document.getElementById('cy'),

	        style: [
		{
		  selector: 'node',
		  style: {
		    'height': 20,
		    'width': 20,
		    'background-color': 'grey'
		    //'content': 'data(name)'
		  }		  
		},
		{
		  selector: 'edge',
		  style: {
		    'curve-style': 'bezier',
		    "target-arrow-shape": "vee"
		  }
		},
		{
		  selector: '.context',
		  style: {
		    'border-width': '4px',
		    'border-color': 'red'
		  }
		},
		...getAllStyles()			
	        ],

		elements: { nodes: [], edges: [] }
	});
	
	window.expandTopHolders = function(id) {
	  console.log('expanding', id);
	  console.log(window.cs.nodes);
	  
	  let target_node;
	  for (let node of window.cs.nodes) {
	    if (node._id == id) { target_node = node; break; }
	  }
	  if (!target_node) { return; }
	  
	  let contract = target_node.relative('is-token');
	  
	  let r = new Relation(contract, 'is-token', target_node);
	  console.log(r);
	  window.actions.THF.onRelation(r);
	}
	
	window.moveContext = function(id) {
	  console.log('moveContext', id);
	  let nodes = cy.$('node');

	  for (let node of nodes) {
	    if (node.hasClass('context')) {
	      node.unselect();
	    }
	    
	    let d = node.data();
	    if (d.raw._id == id) {
	      node.select();
	      node.emit('tap');
	    }
	  }

        }
	
	//window.cy.use (cise);
	cy.on('tap', 'node', function (evt) {
	   let data = evt.target.data();
	   let s;
	   
	   if (window.cs.panels.hasOwnProperty(data.raw.type)) {
	     s = window.cs.panels[data.raw.type]( data.raw );
	   } else {
	     s = data.raw.type + ' ' + (typeof data.raw.val == 'object' ? JSON.stringify(data.raw.val) : data.raw.val);
	   }
	   
	   let resolver = data.raw;
	   let topic;
	   
	   if (resolver.type == 'TokenBEP20') { resolver = resolver.relative('is-token'); }
	   //if (resolver.type == 'TokenAMM')   { resolver = resolver.relative('is-amm'); }
	   if (resolver.type == 'Contract')   { resolver = resolver.relative('is-contract'); }
	   if (resolver.type == "BlockchainAddress") { topic = resolver.val; }
	   
	   let msgs = window.cs.messages.filter( (x)=>{ return x.node == data.raw || x.topic == topic } );
	   if (msgs.length > 0) {
	     s += '<h3>Messages</h3>';
	     for (let msg of msgs) {
	        let color = 'black';
                if (msg.score < 0) { color = 'red'; }
                if (msg.score > 0) { color = 'green'; }
    
                s += '<p style="color: '+color+'"> '+msg.score+' '+msg.msg;
	     }
	   }
	   
	   s += '<p><table border=1><tr><th colspan=3>Relations</th></tr>'
	   for (let r of window.cs.relations) {
	     if (r.relation.substring(0,1) == '@') { continue; }
	     if (r.src_node == data.raw) { s += '<tr><td>this</td><td>'+r.relation+'</td><td><a href=# onClick="moveContext('+r.dst_node._id+')">'+r.dst_node.toString()+"</a></td></tr>"; }
	     if (r.dst_node == data.raw) { s += '<tr><td><a href=# onClick="moveContext('+r.src_node._id+')">'+r.src_node.toString()+'</a></td><td>'+r.relation+'</td><td>this</td></tr>'; }
	   }
	   s += '</table>';
	  
           console.log(s);
           document.getElementById('panel').innerHTML = s;
        });
	
	const ANIMATION_DURATION = 400;
	
	function onSelect(el) {
	  //console.log('select', el);
	  el.target.addClass('context');
	}
	
	function onUnselect(el) {
	  //console.log('unselect', el);
	  el.target.removeClass('context');
	}
	
        window.updateLayout = async(cb)=>{
           let layout = window.cy.layout({
             name: 'klay',
             animate: 'end',
             animationDuration: ANIMATION_DURATION,
             klay: {
               nodeLayering: 'NETWORK_SIMPLEX',
               nodePlacement: 'BRANDES_KOEPF'
             }
           });
           layout.run();
           
           let nodes = cy.$('node');
           
           nodes.removeListener( 'select', onSelect );
           nodes.removeListener( 'unselect', onUnselect );
           
           nodes.on('select', onSelect );
           nodes.on('unselect', onUnselect );
           
           await new Promise(resolve => setTimeout(resolve, ANIMATION_DURATION));
           cb();         
        };

	var cs = window.cs = new ChainSpiderWeb();
	var actions = window.actions = registerModules(cs);

	function onStartClick(e) {
	  cs.createNode('BlockchainAddress', document.getElementById('addr').value);
	}
	document.onStartClick = onStartClick;
	
	const params = new URLSearchParams(window.location.search);
        const addr = params.get("addr");
        if (addr) {
          document.getElementById('addr').value = addr;
          document.onStartClick();
        }

});


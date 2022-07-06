import { ChainSpider, Relation } from './chainspider.mjs';
import { registerModules } from './modules.mjs';
import klay  from 'cytoscape-klay';

function proxyUrl(url) {
  return 'https://corsproxy.io/?' + encodeURI(url);
}

class ChainSpiderWeb extends ChainSpider {
  constructor() {
    super();
    
    this.animq = [];
    this.animating = false;
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
    let color = 'black';
    if (msg.score < 0) { color = 'red'; }
    if (msg.score > 0) { color = 'green'; }
    document.getElementById('messages').innerHTML += '<p style="color: '+color+'">'+msg.msg; 
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
		    'background-color': 'grey',
		    //'content': 'data(name)'
		  }
		},
		{
		  selector: 'node[type="TokenBEP20"]',
		  style: {
		    'height': 40,
		    'width': 40,
		    'shape': 'round-rectangle',		    
		    'background-color': 'green',
		    'content': 'data(name)'
		  }
		},
		{
		  selector: 'node[type="TopHoldersReport"]',
		  style: {
		    'height': 64,
		    'width': 64,
		    'shape': 'round-rectangle',		    
		    'background-image': require('/icons/report.png')
		  }
		},
		{
		  selector: 'node[type="TokenAMM"]',
		  style: {
		    'height': 40,
		    'width': 40,
		    'shape': 'round-rectangle',		    
		    'background-color': 'purple',
		    'content': 'LP'
		  }
		},
		{
		  selector: 'node[type="WhitelistedToken"]',
		  style: {
		    'height': 64,
		    'width': 64,
		    'shape': 'round-rectangle',		    
		    'background-image': 'data(logoURI)',
		    'background-color': 'white',
		    'content': 'data(platform)'
		  }
		},
		{
		  selector: 'node[type="Contract"]',
		  style: {
		    'height': 20,
		    'width': 20,
		    'shape': 'square',		    
		    'background-color': 'blue',
		    'content': 'Contract'
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
		  selector: 'edge[relation="holder"]',
		  style: {
		    'curve-style': 'bezier',
		    'line-color': 'green',
		    "target-arrow-shape": "square"
		  }
		},
                {
		  selector: 'edge[relation="is-contract"]',
		  style: {
		    'curve-style': 'bezier',
		    'line-color': 'blue',
		    "target-arrow-shape": "circle"
		  }
		},
                {
		  selector: 'edge[relation="trades-on"]',
		  style: {
		    'curve-style': 'bezier',
		    'line-color': 'purple',
		    "target-arrow-shape": "circle"
		  }
		},
                {
		  selector: 'edge[relation="bases"]',
		  style: {
		    'curve-style': 'bezier',
		    'line-color': 'purple',
		    "target-arrow-shape": "circle"
		  }
		}			
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
	
	//window.cy.use (cise);
	cy.on('tap', 'node', function (evt) {
	   let data = evt.target.data();
	   
	   let s = data.raw.type + ' ' + (typeof data.raw.val == 'object' ? JSON.stringify(data.raw.val) : data.raw.val);
	   
	   if (data.raw.type == 'TokenBEP20') {
	     s += `<br><input type=button value="Expand Top Holders" onClick=" window.expandTopHolders(${data.raw._id}); ">`;
	   }
           console.log(s);
           document.getElementById('panel').innerHTML = s;
        });
	
	const ANIMATION_DURATION = 400;
	
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
           await new Promise(resolve => setTimeout(resolve, ANIMATION_DURATION));
           cb();         
        };

	var cs = window.cs = new ChainSpiderWeb();
	var actions = window.actions = registerModules(cs);

	function onStartClick(e) {
	  cs.createNode('BlockchainAddress', document.getElementById('addr').value);
	}
	document.onStartClick = onStartClick;

});


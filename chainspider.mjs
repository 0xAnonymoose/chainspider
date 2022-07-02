var _nextIndex = 0;

class AutoIndexed {
  constructor() {
    this._id = _nextIndex++;
  }
}

class RelationSet {
  constructor(node) {
    this.node = node;
    this.relations = {};
  }
   
  hasRelation(target,relation) {
    if (!this.relations.hasOwnProperty(relation)) { this.relations[relation] = []; }
    return (this.relations[relation].indexOf(target) > -1);
  }
  
  addRelation(target, relation) {
    if (!this.hasRelation(target,relation)) {
      this.relations[relation].push(target);
      //console.log('<NewRelation>', this.node.toString(), relation.toString(), target.toString() );
    }
  }
  
  getRelation(relation, idx = 0) {
   let r = this.relations[relation];
   if (!r) { return idx == 0 ? null : []; }
   return idx != null ? r[idx] : r;
  }  
}

class Message {
  constructor (src, node, score, msg) {
    this.src = src;
    this.node = node;
    this.score = score;
    this.msg = msg;
  }
}

class Node extends AutoIndexed {
  constructor(type, val) {
    super();
    
    this.type = type;
    this.val = val;
    this.relations = new RelationSet(this);
    this.onMessage = null;
    
    this.totalScore = 0;
    this.messages = [];
  } 
  
  toString() { 
    let v = typeof this.val == 'string' ? this.val : JSON.stringify(this.val);
    if (v.length > 64) { v = v.substring(0,64) + '...'; }
    return `${this.type}#${this._id}[${v}]`;
  }

  relative(relation) {
    return this.relations.getRelation(relation);
  }
  
  reportMessage(src, score, msg) {
    let m = new Message(src, this, score, msg);
    this.messages.push(m);
    
    this.totalScore = 0;
    for (let i=0; i < this.messages.length; i++) { this.totalScore += this.messages[i].score; }
    
    if (this.onMessage != null) { this.onMessage(m); }
  }
}

export class Inspector {

  constructor(cs, id) {
    this.cs = cs;
    this.id = id;
  }

  subscribe(t, r) {
    this.cs.createSubscription(this, t, r);
  }
  
  async onRelation(r) {
  }
 
}

export class Relation extends AutoIndexed {
  constructor(src_node, relation, dst_node) {
    super();
    
    this.src_node = src_node;
    this.relation = relation;
    this.dst_node = dst_node;
  }
  
  toString() {
    return `# ${this._id} ${this.src_node.toString()} :${this.relation} ${this.dst_node !== true ? this.dst_node.toString() : ""}`;
  }
  
}

class Subscription {
  constructor (inspector, type, relation) {
    this.inspector = inspector;
    this.type = type;
    this.relation = relation;
  }
}

export class ChainSpider {

  constructor() {
    this.nodes = [];
    this.relations = [];
    this.subscriptions = [];
    this.messages = [];
  }

  createNode(type, val) {
    for (let n of this.nodes) {
      if (n.type == type && JSON.stringify(val) == JSON.stringify(n.val)) { 
        console.log('<DupeNode>', 'not creating', type, val);
        return n;
      }
    }
    
    let node = new Node(type, val);
    node.onMessage = this.onMessage;
    this.nodes.push(node);

    // fire virtual @on-create event
    this.createEvent( node, '@on-create' );
    
    // notify UX
    this.onNode(node);
   
    return node;
  }
  
  createRelation(src_node, relation, dst_node) {
    for (let r of this.relations) {
      if (r.src_node == src_node && r.relation == relation && r.dst_node == dst_node) { 
        console.log('<DupeRelation>', 'not creating', src_node.toString(), relation, dst_node.toString());
        return r;
      }
    }
      
    let r = new Relation(src_node, relation, dst_node);
    this.relations.push(r);
    
    // link relation to src and dst nodes
    src_node.relations.addRelation(dst_node, relation);
    if (dst_node && dst_node !== true) {
      dst_node.relations.addRelation(src_node, relation);
    }
    
    // fire subscriptions
    for (let s of this.subscriptions) {
      if (s.type == src_node.type && s.relation == r.relation) {
         s.inspector.onRelation(r);
      }
    }
    
    // notify UX
    this.onRelation(r);

    return r;
  }
  
  createEvent(src_node, event) {
    return this.createRelation(src_node, event, true);
  }
  
  createSubscription(inspector, type, relation) {
    let s = new Subscription(inspector, type, relation);
    this.subscriptions.push(s);
    return s;
  }
  
  onNode(node) {
    console.log('<CreatedNode>', node.toString());
  }
  
  onRelation(relation) {
    console.log((relation.relation.substring(0,1) == '@') ? '<Event>' : '<NewRelation>', relation.toString());   
  }
  
  onMessage(msg) {
    console.log('<Message:'+msg.src+'>', msg.score, msg.msg);
    console.log('<Score>', msg.node.toString(), msg.node.totalScore);  
  }
   
}



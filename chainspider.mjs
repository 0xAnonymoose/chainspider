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
  
  getRelation(relation) {
   let r = this.relations[relation];
   if (!r) { return null; }
   return r[0];
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

class Node {
  constructor(type, val) {   
    this.type = type;
    this.val = val;
    this.relations = new RelationSet(this);
    
    this.totalScore = 0;
    this.messages = [];
    
    console.log('<CreatedNode>', this.toString());
  } 
  
  toString() { 
    let v = typeof this.val == 'string' ? this.val : JSON.stringify(this.val);
    if (v.length > 64) { v = v.substring(0,64) + '...'; }
    return `${this.type}[${v}]`;
  }

  relative(relation) {
    return this.relations.getRelation(relation);
  }
  
  reportMessage(src, score, msg) {
    let m = new Message(src, this, score, msg);
    this.messages.push(m);
    
    this.totalScore = 0;
    for (let i=0; i < this.messages.length; i++) { this.totalScore += this.messages[i].score; }

    console.log('<Message:'+src+'>', score, msg);
    console.log('<Score>', this.toString(), this.totalScore);
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

class Relation {
  constructor(src_node, relation, dst_node) {
    this.src_node = src_node;
    this.relation = relation;
    this.dst_node = dst_node;
  }
  
  toString() {
    return `${this.src_node.toString()} :${this.relation} ${this.dst_node && this.dst_node.toString()}`;
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
    this.nodes.push(node);

    // fire @on-create virtual relation
    for (let s of this.subscriptions) {
      if (s.type == type && s.relation == '@on-create') {
         s.inspector.onRelation(new Relation(node, '@on-create', null));
      }
    }
    
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
    dst_node.relations.addRelation(src_node, relation);
    
    // fire subscriptions
    for (let s of this.subscriptions) {
      if (s.type == src_node.type && s.relation == r.relation) {
         s.inspector.onRelation(r);
      }
    }

    console.log('<NewRelation>', r.toString());
    return r;
  }
  
  createSubscription(inspector, type, relation) {
    let s = new Subscription(inspector, type, relation);
    this.subscriptions.push(s);
    return s;
  }
   
}



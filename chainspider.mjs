class RelationSet {
  constructor() {
    this.relations = {};
  }
  
  addRelation(r,t) {
    if (!this.relations.hasOwnProperty(r)) { this.relations[r] = {}; }
    if (this.relations[r].indexOf(t) == -1) {
      this.relations[r].push(t);
    }
  }
}

class Node {
  constructor(type, val) {   
    this.type = type;
    this.val = val;
    this.relations = new RelationSet();
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
  
  onRelation(r) {
  }
  
  onCreate(n) {
  }
  
}

class Relation {
  constructor(src_node, relation, dst_node) {
    this.src_node = src_node;
    this.relation = relation;
    this.dst_node = dst_node;
    
    this.src_node.relations.addRelation(dst_node, relation);
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
  }

  createNode(type, val) {
    let node = new Node(this, type, val);
    this.nodes.push(node);

    // fire @on-create
    for (let s of this.subscriptions) {
      if (s.type == type && s.relation == '@on-create') {
         s.inspector.onRelation(new Relation(node, '@on-create', null));
      }
    }
    
    return node;
  }
  
  createRelation(src_node, relation, dst_node) {
    let r = new Relation(src_node, relation, dst_node);
    this.relations.push(r);
    
    // fire subscriptions
    for (let s of this.subscriptions) {
      if (s.type == src_node.type && s.relation == r.relation) {
         s.inspector.onRelation(r);
      }
    }

    return r;
  }
  
  createSubscription(inspector, type, relation) {
    let s = new Subscription(inspector, type, relation);
    this.subscriptions.push(s);
    return s;
  }
   
}



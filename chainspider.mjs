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
      console.log('<NewRelation>', this.node.toString(), relation.toString(), target.toString() );
    }
  }
}

class Node {
  constructor(type, val) {   
    this.type = type;
    this.val = val;
    this.relations = new RelationSet(this);
    
    console.log('<CreatedNode>', this.toString());
  } 
  
  toString() { 
    let v = typeof this.val == 'string' ? this.val : JSON.stringify(this.val);
    if (v.length > 64) { v = v.substring(0,64) + '...'; }
    return `${this.type}[${v}]`;
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
    
    if (relation.substring(0,1) != '@') {
      this.src_node.relations.addRelation(dst_node, relation);
    }
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
  }

  createNode(type, val) {
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



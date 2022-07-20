# chainspider

ChainSpider is a knowledge graph-based solution for Blockchain forensics, malware detection and more.

# Concepts

## Node

Nodes have a type and a value, are used to represent data in the knowledge graph.

## Relationship

Relationships have a source node, destination node and a relation.  They represent links between Nodes.

## Inspector

Inspectors subscribe to Node and/or Relationship creation events, consult some data sources and create more Nodes and Relationships to expand the knowledge graph.

### Actions

A special kind of subscription called an Action is one that's explicitly triggered by the user instead of by another event in the system.

### Panels

Panels are functions that render an HTML representation of a Node.

### Styles

Styles are functions that return CytoscapeJS style representations of Nodes and Edges.

## Messages

An inspector can emit a Message which is optionaly attached to a node.  The message has a score, which when signed negative indicates the message represents something bad and positive when the message represents something good.

### Total Score

The sum of scores from all messages is called the Total Score and represents the "sentiment" of the analysis: large positive values indicate confidence the token is good, while large negative mean red flags were identified.

# Modules (Inspectors)

| Module | Subscriptions | Outputs | Notes |
|--------|---------------|---------|-------|
|ContractFinder|BA @on-create|BA is-contract, Contract|Checks BA for Code segments, downloads source from BSCScan|

TODO


# Frontends

Three frontends are implemented in this repository.

## CLI

## Desktop (CytoscapeJS)

## Mobile (PicoCSS)

# Roadmap

## MVP

```
[x] ChainSpider core methods and data types
[x] Animated visualizations of nodes and edges
[x] BlockchainAddress
[x] UX to create a BlockchainAddress
[x] Contract identification 
[x] Contract download evm code 
[x] BEP20 identification and decoding
[x] BEP20 whitelist checks 
[x] BEP20 panel: expand top holders
[x] BEP20 top holder sanity check
[x] LP discovery via 1inch API
[x] PCS LP identification and decoding
[x] LP sanity checks
[x] UX for action panel (basic)
[x] UX for messaging (basic)
```

## Closed Beta


```
[x] UX plumbing for query parmeters
[x] LP discover via routers (PCS, Ape, Biswap, Babyswap)
[x] Apeawap, Biswap, Babyswap AMM support
[x] Refactor Messages
[x] Move node/edge style definitions into modules
[x] Contract download solidity code
[x] Contract blockchain-malware checks
[x] UX plumbing for Messaging and Scoring (improved)
[x] UX plumbing for action panel (improved)
[x] Panel for WhitelistedToken
[x] Panel for TokenAMM
[x] Panel: better Relations table
[x] Panel: hyperlinks to Relation endpoints
[x] Panel: highlight active node
[x] Whitelist: Refactor to always output a report, add icons
[x] Panel for BA and Contract with bscscan links
[ ] Whitelist: panel add buttons for other scanners when token passes
[ ] Deployer discovery
[ ] Discover Locks and Locked tokens
[x] Discover ICO 
```

## Open Beta

```
[ ] TokenAMM panel: trade now buttons for ape, bi, baby and cakeswaps
[ ] Contract blockchain-malware checks: source, filenames
[ ] LPFactoryFinder: Multicall
[ ] TokenFinder: Multicall
[ ] Deployer sanity checks
[ ] Deployer panel: expand all contracts
[ ] Lock checks
[ ] ICO checks
[ ] LP top holder discover and checks
[ ] BlockchainTransaction
[ ] Transaction panel: event decoder 
[ ] BlockchainAddress panel: transaction explorer
[ ] BEP20 panel: holder explorer
[ ] UX control animation speed
[ ] UX feedback on active subscriptions
[ ] UX Save and Load workspaces
[ ] UX to delete nodes
[ ] User-provided names for BlockchainAddress
[ ] Discover bscscan names for BlockchainAddress
[ ] CoinMarketCap API integration
[ ] Contract blacklist check
[ ] Deployer blacklist check 
```

## Launch

```
[ ] Celebrate!  
```

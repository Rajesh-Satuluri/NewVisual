export default {
  id: "how-do-raft-paxos-gossip-and-quorum-based-replication-actual",
  question: "How do Raft, Paxos, gossip, and quorum-based replication actually fit into my design?",
  icon: "🔗",
  difficulty: "Advanced",
  category: "Consistency Availability & Transactions",
  tags: ["PAXOS","RAFT","Distributed Systems"],
  tldr: "Use consensus for a single agreed log (leader election, config), quorum replication for tunable R/W durability, and gossip for scalable, eventually-consistent membership.",
  steps: [],
  checklist: [],
  draft: true
};

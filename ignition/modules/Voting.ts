import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("VotingModule", (m) => {
  const voting = m.contract("Voting");

  const voter1 = m.getAccount(1);
  const voter2 = m.getAccount(2);
  const voter3 = m.getAccount(3);

  // Add voters
  const addVoter1 = m.call(voting, "addVoter", [voter1], { id: "addVoter1" });
  const addVoter2 = m.call(voting, "addVoter", [voter2], { id: "addVoter2", after: [addVoter1] });
  const addVoter3 = m.call(voting, "addVoter", [voter3], { id: "addVoter3", after: [addVoter2] });

  // Start proposals registration
  const startProposals = m.call(voting, "startProposalsRegistering", [], {
    id: "startProposalsRegistering",
    after: [addVoter1, addVoter2, addVoter3],
  });

  // Add proposals from different voter accounts
  const prop1 = m.call(voting, "addProposal", ["Proposal 1"], {
    from: voter1,
    id: "addProposal1",
    after: [startProposals],
  });
  const prop2 = m.call(voting, "addProposal", ["Proposal 2"], {
    from: voter2,
    id: "addProposal2",
    after: [startProposals],
  });
  const prop3 = m.call(voting, "addProposal", ["Proposal 3"], {
    from: voter3,
    id: "addProposal3",
    after: [startProposals],
  });

  // End proposals registration
  const endProposals = m.call(voting, "endProposalsRegistering", [], {
    id: "endProposalsRegistering",
    after: [prop1, prop2, prop3],
  });

  // Start voting session
  const startVoting = m.call(voting, "startVotingSession", [], {
    id: "startVotingSession",
    after: [endProposals],
  });

  // Cast votes from registered voters
  const vote1 = m.call(voting, "setVote", [1n], {
    from: voter1,
    id: "vote1",
    after: [startVoting],
  });
  const vote2 = m.call(voting, "setVote", [2n], {
    from: voter2,
    id: "vote2",
    after: [startVoting],
  });
  const vote3 = m.call(voting, "setVote", [2n], {
    from: voter3,
    id: "vote3",
    after: [startVoting],
  });

  // End voting session
  const endVoting = m.call(voting, "endVotingSession", [], {
    id: "endVotingSession",
    after: [vote1, vote2, vote3],
  });

  // Tally votes
  m.call(voting, "tallyVotes", [], {
    id: "tallyVotes",
    after: [endVoting],
  });

  return { voting };
});

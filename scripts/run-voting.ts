import { network } from "hardhat";

const { ethers } = await network.create({
  network: "hardhatOp",
  chainType: "op",
});

const [owner, voter1, voter2, voter3] = await ethers.getSigners();

console.log("Deploying Voting contract...");
const voting = await ethers.deployContract("Voting");

const address = await voting.getAddress();
console.log("Voting deployed to:", address);

let workflowStatus = await voting.workflowStatus();
console.log("Initial Workflow status:", workflowStatus.toString()); // 0 = RegisteringVoters

// Add same voters (only allowed while status == RegisteringVoters, and only by owner)
for (const voter of [voter1, voter2, voter3]) {
  console.log(`Adding ${voter.address} as a voter...`);
  await voting.addVoter(voter.address);
  console.log("Voter registered successfully.");
}

console.log("Starting proposals registration phase...");
await voting.startProposalsRegistering();

// add proposals
console.log("Adding proposals...");
await voting.connect(voter1).addProposal("Proposal 1");
await voting.connect(voter2).addProposal("Proposal 2");
await voting.connect(voter3).addProposal("Proposal 3");

console.log("Ending proposals registration phase...");
await voting.endProposalsRegistering();

console.log("Starting voting phase...");
await voting.startVotingSession();

console.log("Voting...");
await voting.connect(voter1).setVote(1); // Vote for Proposal 1
await voting.connect(voter2).setVote(2); // Vote for Proposal 2
await voting.connect(voter3).setVote(2); // Vote for Proposal 2

console.log("Ending voting phase...");
await voting.endVotingSession();

console.log("Tallying votes...");
await voting.tallyVotes();

workflowStatus = await voting.workflowStatus();
console.log("New Workflow status:", workflowStatus.toString()); // 5 = VotesTallied

const winningProposalID = await voting.winningProposalID();
console.log("Winning proposal ID:", winningProposalID.toString());
const winningProposal = await voting.connect(voter1).getOneProposal(winningProposalID);
console.log("Winning proposal description:", winningProposal.description);

console.log("Script completed successfully.");

import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create({
  network: "hardhatOp",
  chainType: "op",
});

describe("Voting Contract Tests", function () {
  let voting: any;
  let owner: any;
  let voter1: any;
  let voter2: any;
  let voter3: any;
  let nonVoter: any;

  beforeEach(async function () {
    [owner, voter1, voter2, voter3, nonVoter] = await ethers.getSigners();
    voting = await ethers.deployContract("Voting");
  });

  describe("Deployment and Initial State", function () {
    it("should set the correct owner", async function () {
      expect(await voting.owner()).to.equal(owner.address);
    });

    it("should start with WorkflowStatus.RegisteringVoters", async function () {
      expect(await voting.workflowStatus()).to.equal(0n); // RegisteringVoters
    });

    it("should start with winningProposalID as 0", async function () {
      expect(await voting.winningProposalID()).to.equal(0n);
    });
  });

  describe("Registration Phase (addVoter)", function () {
    it("should allow owner to register a voter", async function () {
      await expect(voting.addVoter(voter1.address))
        .to.emit(voting, "VoterRegistered")
        .withArgs(voter1.address);

      // Verify voter is registered
      const voterData = await voting.connect(voter1).getVoter(voter1.address);
      expect(voterData.isRegistered).to.be.true;
      expect(voterData.hasVoted).to.be.false;
      expect(voterData.votedProposalId).to.equal(0n);
    });

    it("should revert if a non-owner tries to register a voter", async function () {
      await expect(voting.connect(voter1).addVoter(voter2.address))
        .to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount")
        .withArgs(voter1.address);
    });

    it("should revert if registering a voter that is already registered", async function () {
      await voting.addVoter(voter1.address);
      await expect(voting.addVoter(voter1.address)).to.be.revertedWith("Already registered");
    });

    it("should revert if registering a voter when not in RegisteringVoters phase", async function () {
      await voting.addVoter(voter1.address);
      await voting.startProposalsRegistering();
      await expect(voting.addVoter(voter2.address)).to.be.revertedWith(
        "Voters registration is not open yet"
      );
    });
  });

  describe("Access Control for Getters (getVoter and getOneProposal)", function () {
    beforeEach(async function () {
      await voting.addVoter(voter1.address);
      await voting.addVoter(voter2.address);
      await voting.addVoter(voter3.address);
    });

    it("should revert if a non-registered address tries to get voter details", async function () {
      await expect(voting.connect(nonVoter).getVoter(voter1.address)).to.be.revertedWith(
        "You're not a voter"
      );
    });

    it("should allow registered voter to get voter details", async function () {
      const voterData = await voting.connect(voter1).getVoter(voter2.address);
      expect(voterData.isRegistered).to.be.true;
    });

    it("should revert if a non-registered address tries to get proposal details", async function () {
      await expect(voting.connect(nonVoter).getOneProposal(0)).to.be.revertedWith(
        "You're not a voter"
      );
    });

    describe("With registered proposals", function () {
      beforeEach(async function () {
        await voting.startProposalsRegistering();
        await voting.connect(voter1).addProposal("Proposal 1"); // ID 1
        await voting.connect(voter2).addProposal("Proposal 2"); // ID 2
        await voting.connect(voter3).addProposal("Proposal 3"); // ID 3
      });

      it("should allow registered voter to get proposal details", async function () {
        const proposal = await voting.connect(voter1).getOneProposal(1); // Proposal 1
        expect(proposal.description).to.equal("Proposal 1");
        expect(proposal.voteCount).to.equal(0n);
      });

      it("should revert if voter gets a proposal with invalid index", async function () {
        await expect(voting.connect(voter1).getOneProposal(99)).to.revert(ethers);
      });
    });
  });

  describe("Proposals Phase (addProposal)", function () {
    beforeEach(async function () {
      await voting.addVoter(voter1.address);
      await voting.addVoter(voter2.address);
      await voting.addVoter(voter3.address);
    });

    it("should revert if adding a proposal when phase has not started", async function () {
      await expect(voting.connect(voter1).addProposal("My proposal")).to.be.revertedWith(
        "Proposals are not allowed yet"
      );
    });

    describe("When proposals registration has started", function () {
      beforeEach(async function () {
        await voting.startProposalsRegistering();
      });

      it("should allow voter to add a proposal and emit ProposalRegistered event", async function () {
        await expect(voting.connect(voter1).addProposal("My Proposal 1"))
          .to.emit(voting, "ProposalRegistered")
          .withArgs(1n);

        const proposal = await voting.connect(voter1).getOneProposal(1);
        expect(proposal.description).to.equal("My Proposal 1");
        expect(proposal.voteCount).to.equal(0n);
      });

      it("should revert if adding an empty proposal", async function () {
        await expect(voting.connect(voter1).addProposal("")).to.be.revertedWith(
          "Vous ne pouvez pas ne rien proposer"
        );
      });

      it("should revert if non-voter tries to add a proposal", async function () {
        await expect(voting.connect(nonVoter).addProposal("Hacked Proposal")).to.be.revertedWith(
          "You're not a voter"
        );
      });
    });
  });

  describe("Voting Phase (setVote)", function () {
    beforeEach(async function () {
      await voting.addVoter(voter1.address);
      await voting.addVoter(voter2.address);
      await voting.addVoter(voter3.address);
      await voting.startProposalsRegistering();
      await voting.connect(voter1).addProposal("Proposal 1");
      await voting.connect(voter2).addProposal("Proposal 2");
      await voting.connect(voter3).addProposal("Proposal 3");
    });

    it("should revert if voting is not open yet", async function () {
      await expect(voting.connect(voter1).setVote(1)).to.be.revertedWith(
        "Voting session havent started yet"
      );
    });

    describe("When voting session has started", function () {
      beforeEach(async function () {
        await voting.endProposalsRegistering();
        await voting.startVotingSession();
      });

      it("should allow voter to vote, emit Voted event, and update counts", async function () {
        await expect(voting.connect(voter1).setVote(1))
          .to.emit(voting, "Voted")
          .withArgs(voter1.address, 1n);

        const voterData = await voting.connect(voter1).getVoter(voter1.address);
        expect(voterData.hasVoted).to.be.true;
        expect(voterData.votedProposalId).to.equal(1n);

        const proposal = await voting.connect(voter1).getOneProposal(1);
        expect(proposal.voteCount).to.equal(1n);
      });

      it("should revert if voter tries to vote twice", async function () {
        await voting.connect(voter1).setVote(1);
        await expect(voting.connect(voter1).setVote(2)).to.be.revertedWith(
          "You have already voted"
        );
      });

      it("should revert if voting for non-existent proposal ID", async function () {
        await expect(voting.connect(voter1).setVote(4)).to.be.revertedWith(
          "Proposal not found"
        );
      });

      it("should revert if non-voter tries to vote", async function () {
        await expect(voting.connect(nonVoter).setVote(1)).to.be.revertedWith(
          "You're not a voter"
        );
      });
    });
  });

  describe("State Transitions & Workflows", function () {
    it("should restrict state change access to owner only", async function () {
      await expect(voting.connect(voter1).startProposalsRegistering())
        .to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount")
        .withArgs(voter1.address);
    });

    it("should revert if transitioning to ProposalsRegistrationStarted when status is not RegisteringVoters", async function () {
      await voting.startProposalsRegistering();
      await expect(voting.startProposalsRegistering()).to.be.revertedWith(
        "Registering proposals cant be started now"
      );
    });

    it("should revert if transitioning to ProposalsRegistrationEnded when status is not ProposalsRegistrationStarted", async function () {
      await expect(voting.endProposalsRegistering()).to.be.revertedWith(
        "Registering proposals havent started yet"
      );
    });

    it("should revert if transitioning to VotingSessionStarted when status is not ProposalsRegistrationEnded", async function () {
      await expect(voting.startVotingSession()).to.be.revertedWith(
        "Registering proposals phase is not finished"
      );
    });

    it("should revert if transitioning to VotingSessionEnded when status is not VotingSessionStarted", async function () {
      await expect(voting.endVotingSession()).to.be.revertedWith(
        "Voting session havent started yet"
      );
    });

    it("should revert if transitioning to VotesTallied when status is not VotingSessionEnded", async function () {
      await expect(voting.tallyVotes()).to.be.revertedWith(
        "Current status is not voting session ended"
      );
    });

    it("should allow a full correct workflow and emit WorkflowStatusChange events", async function () {
      await expect(voting.startProposalsRegistering())
        .to.emit(voting, "WorkflowStatusChange")
        .withArgs(0, 1);
      expect(await voting.workflowStatus()).to.equal(1n);

      await expect(voting.endProposalsRegistering())
        .to.emit(voting, "WorkflowStatusChange")
        .withArgs(1, 2);
      expect(await voting.workflowStatus()).to.equal(2n);

      await expect(voting.startVotingSession())
        .to.emit(voting, "WorkflowStatusChange")
        .withArgs(2, 3);
      expect(await voting.workflowStatus()).to.equal(3n);

      await expect(voting.endVotingSession())
        .to.emit(voting, "WorkflowStatusChange")
        .withArgs(3, 4);
      expect(await voting.workflowStatus()).to.equal(4n);

      await expect(voting.tallyVotes())
        .to.emit(voting, "WorkflowStatusChange")
        .withArgs(4, 5);
      expect(await voting.workflowStatus()).to.equal(5n);
    });
  });

  describe("Tallying Votes & Winning Proposal", function () {
    beforeEach(async function () {
      await voting.addVoter(voter1.address);
      await voting.addVoter(voter2.address);
      await voting.addVoter(voter3.address);
      await voting.startProposalsRegistering();
      await voting.connect(voter1).addProposal("Proposal 1");
      await voting.connect(voter2).addProposal("Proposal 2");
      await voting.connect(voter3).addProposal("Proposal 3");
    });

    it("should correctly tally votes and set winningProposalID", async function () {
      await voting.endProposalsRegistering();
      await voting.startVotingSession();

      await voting.connect(voter1).setVote(1);
      await voting.connect(voter2).setVote(2);
      await voting.connect(voter3).setVote(2);

      await voting.endVotingSession();
      await expect(voting.tallyVotes())
        .to.emit(voting, "WorkflowStatusChange")
        .withArgs(4, 5);

      expect(await voting.winningProposalID()).to.equal(2n);
    });

    it("should resolve tie by selecting the proposal with the lower ID", async function () {
      await voting.endProposalsRegistering();
      await voting.startVotingSession();

      await voting.connect(voter1).setVote(1);
      await voting.connect(voter2).setVote(2);
      // voter3 does not vote, so Proposal 1 and Proposal 2 are tied with 1 vote each

      await voting.endVotingSession();
      await voting.tallyVotes();

      expect(await voting.winningProposalID()).to.equal(1n);
    });
  });
});

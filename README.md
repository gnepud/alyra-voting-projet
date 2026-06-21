# Alyra Voting Project (Hardhat 3 + Mocha + Ethers)

This project implements a decentralized voting system using Solidity, TypeScript, and Hardhat 3. It includes the `Voting` contract, a script to simulate the entire voting lifecycle, and an Ignition deployment module.

## Voting System Workflow

The voting process follows a strict state machine defined by the `WorkflowStatus` enum in the contract:

1. **RegisteringVoters** (Initial status): The contract owner registers voter addresses.
2. **ProposalsRegistrationStarted**: The owner opens the proposal phase. Registered voters can submit proposals.
3. **ProposalsRegistrationEnded**: The owner ends the proposal phase.
4. **VotingSessionStarted**: The owner opens the voting session. Registered voters can cast one vote for a proposal.
5. **VotingSessionEnded**: The owner closes the voting session.
6. **VotesTallied**: The owner tallies the votes to determine the winning proposal.

---

## Project Structure

- `contracts/Voting.sol`: The Solidity voting contract.
- `test/Voting.ts`: The unit test suite using Mocha, Chai, and Ethers.
- `scripts/run-voting.ts`: A script to run the contract's lifecycle end-to-end on a simulated network.
- `ignition/modules/Voting.ts`: Hardhat Ignition module to deploy the contract and perform all steps of the voting flow.
- `hardhat.config.ts`: Configuration file defining networks (including the simulated Optimism chain `hardhatOp`).

---

## Usage

### 1. Compile and Typecheck

Build the contract and verify TypeScript types:

```shell
npx hardhat build && npx tsc --noEmit
```

### 2. Run the Voting Lifecycle Simulation Script

To run the end-to-end voting script locally:

```shell
npx hardhat run scripts/run-voting.ts
```

This will deploy the contract, register voters, submit proposals, cast votes, and tally the final result.

### 3. Deploy and Execute using Hardhat Ignition

To run the Hardhat Ignition module which executes the entire deployment and setup sequence on the local network:

```shell
npx hardhat ignition deploy ignition/modules/Voting.ts --network localhost --reset
```

### 4. Run Unit Tests

We have implemented a comprehensive unit test suite in [test/Voting.ts](file:///Users/sleede/apps/alyra-voting-projet/test/Voting.ts) using Mocha, Chai, and Ethers. The tests use `beforeEach` hooks for full state isolation.

To run the entire unit test suite:

```shell
npm test
```
*(Alternatively: `npx hardhat test`)*

### 5. Check Test Coverage

The unit test suite achieves **100% statement and line coverage** on the [Voting](file:///Users/sleede/apps/alyra-voting-projet/contracts/Voting.sol) contract. To run the tests and generate a coverage report:

```shell
npm run coverage
```
*(Alternatively: `npx hardhat test --coverage`)*

This saves an interactive HTML coverage report to the `coverage/html` directory.

---

## Sepolia Deployment

To deploy this module to Sepolia, set up your configuration variable `SEPOLIA_PRIVATE_KEY` and run:

```shell
npx hardhat ignition deploy --network sepolia ignition/modules/Voting.ts
```

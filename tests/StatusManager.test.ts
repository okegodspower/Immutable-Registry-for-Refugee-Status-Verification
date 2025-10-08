import { describe, it, expect, beforeEach } from "vitest";
import { stringUtf8CV, uintCV, buffCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_STATUS = 101;
const ERR_INVALID_REFUGEE_ID = 102;
const ERR_INVALID_TIMESTAMP = 103;
const ERR_INVALID_AUTHORITY = 104;
const ERR_STATUS_ALREADY_EXISTS = 105;
const ERR_STATUS_NOT_FOUND = 106;
const ERR_INVALID_EXPIRATION = 107;
const ERR_INVALID_REASON = 108;
const ERR_INVALID_LOCATION = 109;
const ERR_INVALID_COUNTRY = 110;
const ERR_INVALID_DOCUMENT_HASH = 111;
const ERR_INVALID_STATUS_TYPE = 112;
const ERR_INVALID_UPDATE_PARAM = 113;
const ERR_MAX_STATUSES_EXCEEDED = 114;
const ERR_INVALID_GRACE_PERIOD = 115;
const ERR_INVALID_RENEWAL_FEE = 116;
const ERR_AUTHORITY_NOT_VERIFIED = 117;
const ERR_INVALID_HISTORY_LIMIT = 118;
const ERR_INVALID_VERIFIER = 119;
const ERR_INVALID_SCORE = 120;
const ERR_INVALID_RATING = 121;
const ERR_INVALID_APPEAL_REASON = 123;
const ERR_INVALID_APPEAL_STATUS = 124;

interface Status {
  refugeeId: number;
  statusType: string;
  timestamp: number;
  expiration: number;
  assigner: string;
  location: string;
  country: string;
  documentHash: Uint8Array;
  reason: string;
  active: boolean;
  score: number;
  rating: number;
}

interface Appeal {
  statusId: number;
  appealReason: string;
  appealTimestamp: number;
  resolver: string;
  resolved: boolean;
  outcome: boolean;
}

interface Verifier {
  verified: boolean;
  score: number;
  assignments: number;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class StatusManagerMock {
  state: {
    nextStatusId: number;
    maxStatuses: number;
    renewalFee: number;
    authorityContract: string | null;
    historyLimit: number;
    gracePeriod: number;
    statuses: Map<number, Status>;
    statusHistory: Map<number, number[]>;
    statusByRefugee: Map<number, number>;
    appeals: Map<number, Appeal>;
    verifiers: Map<string, Verifier>;
  } = {
    nextStatusId: 0,
    maxStatuses: 1000000,
    renewalFee: 500,
    authorityContract: null,
    historyLimit: 10,
    gracePeriod: 30,
    statuses: new Map(),
    statusHistory: new Map(),
    statusByRefugee: new Map(),
    appeals: new Map(),
    verifiers: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextStatusId: 0,
      maxStatuses: 1000000,
      renewalFee: 500,
      authorityContract: null,
      historyLimit: 10,
      gracePeriod: 30,
      statuses: new Map(),
      statusHistory: new Map(),
      statusByRefugee: new Map(),
      appeals: new Map(),
      verifiers: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.stxTransfers = [];
  }

  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (contractPrincipal === "SP000000000000000000002Q6VF78") {
      return { ok: false, value: ERR_INVALID_AUTHORITY };
    }
    if (this.state.authorityContract !== null) {
      return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };
    }
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setRenewalFee(newFee: number): Result<boolean> {
    if (this.state.authorityContract === null) return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };
    this.state.renewalFee = newFee;
    return { ok: true, value: true };
  }

  setGracePeriod(newPeriod: number): Result<boolean> {
    if (newPeriod > 90) return { ok: false, value: ERR_INVALID_GRACE_PERIOD };
    if (this.state.authorityContract === null) return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };
    this.state.gracePeriod = newPeriod;
    return { ok: true, value: true };
  }

  setHistoryLimit(newLimit: number): Result<boolean> {
    if (newLimit <= 0 || newLimit > 20) return { ok: false, value: ERR_INVALID_HISTORY_LIMIT };
    if (this.state.authorityContract === null) return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };
    this.state.historyLimit = newLimit;
    return { ok: true, value: true };
  }

  registerVerifier(): Result<boolean> {
    if (this.state.authorityContract === null) return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };
    this.state.verifiers.set(this.caller, { verified: true, score: 0, assignments: 0 });
    return { ok: true, value: true };
  }

  assignStatus(
    refugeeId: number,
    statusType: string,
    expiration: number,
    location: string,
    country: string,
    documentHash: Uint8Array,
    reason: string,
    score: number,
    rating: number
  ): Result<number> {
    if (this.state.nextStatusId >= this.state.maxStatuses) return { ok: false, value: ERR_MAX_STATUSES_EXCEEDED };
    if (refugeeId <= 0) return { ok: false, value: ERR_INVALID_REFUGEE_ID };
    if (!["registered", "asylum-granted", "pending", "denied"].includes(statusType)) return { ok: false, value: ERR_INVALID_STATUS_TYPE };
    if (expiration <= this.blockHeight) return { ok: false, value: ERR_INVALID_EXPIRATION };
    if (!location || location.length > 100) return { ok: false, value: ERR_INVALID_LOCATION };
    if (!country || country.length > 50) return { ok: false, value: ERR_INVALID_COUNTRY };
    if (documentHash.length !== 32) return { ok: false, value: ERR_INVALID_DOCUMENT_HASH };
    if (reason.length > 200) return { ok: false, value: ERR_INVALID_REASON };
    if (score > 100) return { ok: false, value: ERR_INVALID_SCORE };
    if (rating > 5) return { ok: false, value: ERR_INVALID_RATING };
    const verifier = this.state.verifiers.get(this.caller);
    if (!verifier || !verifier.verified) return { ok: false, value: ERR_INVALID_VERIFIER };
    if (this.state.statusByRefugee.has(refugeeId)) return { ok: false, value: ERR_STATUS_ALREADY_EXISTS };
    if (this.state.authorityContract === null) return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };

    const id = this.state.nextStatusId;
    const status: Status = {
      refugeeId,
      statusType,
      timestamp: this.blockHeight,
      expiration,
      assigner: this.caller,
      location,
      country,
      documentHash,
      reason,
      active: true,
      score,
      rating,
    };
    this.state.statuses.set(id, status);
    this.state.statusByRefugee.set(refugeeId, id);
    this.state.statusHistory.set(id, [id]);
    this.state.verifiers.set(this.caller, {
      verified: true,
      score: verifier.score + score,
      assignments: verifier.assignments + 1,
    });
    this.state.nextStatusId++;
    return { ok: true, value: id };
  }

  getStatus(id: number): Status | null {
    return this.state.statuses.get(id) || null;
  }

  updateStatus(
    statusId: number,
    newStatusType: string,
    newExpiration: number,
    newReason: string,
    newScore: number,
    newRating: number
  ): Result<boolean> {
    const status = this.state.statuses.get(statusId);
    if (!status) return { ok: false, value: ERR_STATUS_NOT_FOUND };
    if (status.assigner !== this.caller) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (!["registered", "asylum-granted", "pending", "denied"].includes(newStatusType)) return { ok: false, value: ERR_INVALID_STATUS_TYPE };
    if (newExpiration <= this.blockHeight) return { ok: false, value: ERR_INVALID_EXPIRATION };
    if (newReason.length > 200) return { ok: false, value: ERR_INVALID_REASON };
    if (newScore > 100) return { ok: false, value: ERR_INVALID_SCORE };
    if (newRating > 5) return { ok: false, value: ERR_INVALID_RATING };

    const updated: Status = {
      ...status,
      statusType: newStatusType,
      expiration: newExpiration,
      reason: newReason,
      timestamp: this.blockHeight,
      score: newScore,
      rating: newRating,
    };
    this.state.statuses.set(statusId, updated);
    let history = this.state.statusHistory.get(statusId) || [];
    if (history.length >= this.state.historyLimit) return { ok: false, value: ERR_INVALID_HISTORY_LIMIT };
    history = [...history, statusId];
    this.state.statusHistory.set(statusId, history);
    return { ok: true, value: true };
  }

  verifyStatus(statusId: number): Result<boolean> {
    const status = this.state.statuses.get(statusId);
    if (!status) return { ok: false, value: ERR_STATUS_NOT_FOUND };
    return { ok: true, value: status.active && this.blockHeight < status.expiration };
  }

  renewStatus(statusId: number): Result<boolean> {
    const status = this.state.statuses.get(statusId);
    if (!status) return { ok: false, value: ERR_STATUS_NOT_FOUND };
    if (this.caller !== status.assigner) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (this.state.authorityContract === null) return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };

    this.stxTransfers.push({ amount: this.state.renewalFee, from: this.caller, to: this.state.authorityContract });
    const updated: Status = {
      ...status,
      expiration: status.expiration + this.state.gracePeriod * 144,
    };
    this.state.statuses.set(statusId, updated);
    return { ok: true, value: true };
  }

  fileAppeal(statusId: number, appealReason: string): Result<boolean> {
    const status = this.state.statuses.get(statusId);
    if (!status) return { ok: false, value: ERR_STATUS_NOT_FOUND };
    if (!appealReason || appealReason.length > 200) return { ok: false, value: ERR_INVALID_APPEAL_REASON };

    const appeal: Appeal = {
      statusId,
      appealReason,
      appealTimestamp: this.blockHeight,
      resolver: this.caller,
      resolved: false,
      outcome: false,
    };
    this.state.appeals.set(statusId, appeal);
    return { ok: true, value: true };
  }

  resolveAppeal(appealId: number, outcome: boolean): Result<boolean> {
    const appeal = this.state.appeals.get(appealId);
    if (!appeal) return { ok: false, value: ERR_STATUS_NOT_FOUND };
    if (appeal.resolver !== this.caller) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (appeal.resolved) return { ok: false, value: ERR_INVALID_APPEAL_STATUS };

    const updatedAppeal: Appeal = { ...appeal, resolved: true, outcome };
    this.state.appeals.set(appealId, updatedAppeal);
    if (outcome) {
      const status = this.state.statuses.get(appeal.statusId);
      if (status) {
        this.state.statuses.set(appeal.statusId, { ...status, active: false });
      }
    }
    return { ok: true, value: true };
  }

  batchVerifyStatuses(statusIds: number[]): Result<boolean[]> {
    const results: boolean[] = [];
    for (const id of statusIds) {
      const verifyResult = this.verifyStatus(id);
      if (!verifyResult.ok) return { ok: false, value: verifyResult.value };
      results.push(verifyResult.value);
    }
    return { ok: true, value: results };
  }

  getStatusCount(): Result<number> {
    return { ok: true, value: this.state.nextStatusId };
  }

  deactivateStatus(statusId: number): Result<boolean> {
    const status = this.state.statuses.get(statusId);
    if (!status) return { ok: false, value: ERR_STATUS_NOT_FOUND };
    if (status.assigner !== this.caller) return { ok: false, value: ERR_NOT_AUTHORIZED };

    const updated: Status = { ...status, active: false };
    this.state.statuses.set(statusId, updated);
    return { ok: true, value: true };
  }
}

describe("StatusManager", () => {
  let contract: StatusManagerMock;

  beforeEach(() => {
    contract = new StatusManagerMock();
    contract.reset();
  });

  it("sets authority contract successfully", () => {
    const result = contract.setAuthorityContract("ST2TEST");
    expect(result.ok).toBe(true);
    expect(contract.state.authorityContract).toBe("ST2TEST");
  });

  it("registers verifier successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.registerVerifier();
    expect(result.ok).toBe(true);
    const verifier = contract.state.verifiers.get("ST1TEST");
    expect(verifier?.verified).toBe(true);
  });

  it("assigns status successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.registerVerifier();
    const hash = new Uint8Array(32).fill(0);
    const result = contract.assignStatus(1, "registered", 1000, "CampA", "CountryX", hash, "Valid docs", 80, 4);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);
    const status = contract.getStatus(0);
    expect(status?.refugeeId).toBe(1);
    expect(status?.statusType).toBe("registered");
    expect(status?.active).toBe(true);
  });

  it("rejects assign status without verifier", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(0);
    const result = contract.assignStatus(1, "registered", 1000, "CampA", "CountryX", hash, "Valid docs", 80, 4);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_VERIFIER);
  });

  it("updates status successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.registerVerifier();
    const hash = new Uint8Array(32).fill(0);
    contract.assignStatus(1, "pending", 1000, "CampA", "CountryX", hash, "Initial", 50, 3);
    const result = contract.updateStatus(0, "asylum-granted", 2000, "Approved", 90, 5);
    expect(result.ok).toBe(true);
    const status = contract.getStatus(0);
    expect(status?.statusType).toBe("asylum-granted");
    expect(status?.score).toBe(90);
  });

  it("verifies status correctly", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.registerVerifier();
    const hash = new Uint8Array(32).fill(0);
    contract.assignStatus(1, "registered", 1000, "CampA", "CountryX", hash, "Valid", 80, 4);
    const result = contract.verifyStatus(0);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    contract.blockHeight = 1001;
    const expiredResult = contract.verifyStatus(0);
    expect(expiredResult.value).toBe(false);
  });

  it("renews status successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.registerVerifier();
    const hash = new Uint8Array(32).fill(0);
    contract.assignStatus(1, "registered", 1000, "CampA", "CountryX", hash, "Valid", 80, 4);
    const result = contract.renewStatus(0);
    expect(result.ok).toBe(true);
    const status = contract.getStatus(0);
    expect(status?.expiration).toBe(1000 + 30 * 144);
    expect(contract.stxTransfers).toEqual([{ amount: 500, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("files and resolves appeal successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.registerVerifier();
    const hash = new Uint8Array(32).fill(0);
    contract.assignStatus(1, "denied", 1000, "CampA", "CountryX", hash, "Invalid", 20, 1);
    const fileResult = contract.fileAppeal(0, "Wrong decision");
    expect(fileResult.ok).toBe(true);
    const resolveResult = contract.resolveAppeal(0, true);
    expect(resolveResult.ok).toBe(true);
    const status = contract.getStatus(0);
    expect(status?.active).toBe(false);
  });

  it("batch verifies statuses", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.registerVerifier();
    const hash = new Uint8Array(32).fill(0);
    contract.assignStatus(1, "registered", 1000, "CampA", "CountryX", hash, "Valid", 80, 4);
    contract.assignStatus(2, "pending", 500, "CampB", "CountryY", hash, "Review", 60, 3);
    contract.blockHeight = 600;
    const result = contract.batchVerifyStatuses([0, 1]);
    expect(result.ok).toBe(true);
    expect(result.value).toEqual([true, false]);
  });

  it("deactivates status successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.registerVerifier();
    const hash = new Uint8Array(32).fill(0);
    contract.assignStatus(1, "registered", 1000, "CampA", "CountryX", hash, "Valid", 80, 4);
    const result = contract.deactivateStatus(0);
    expect(result.ok).toBe(true);
    const status = contract.getStatus(0);
    expect(status?.active).toBe(false);
  });

  it("rejects invalid status type on assign", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.registerVerifier();
    const hash = new Uint8Array(32).fill(0);
    const result = contract.assignStatus(1, "invalid", 1000, "CampA", "CountryX", hash, "Valid", 80, 4);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_STATUS_TYPE);
  });

  it("rejects duplicate status for refugee", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.registerVerifier();
    const hash = new Uint8Array(32).fill(0);
    contract.assignStatus(1, "registered", 1000, "CampA", "CountryX", hash, "Valid", 80, 4);
    const result = contract.assignStatus(1, "asylum-granted", 2000, "CampB", "CountryY", hash, "Approved", 90, 5);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_STATUS_ALREADY_EXISTS);
  });

  it("rejects update by non-assigner", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.registerVerifier();
    const hash = new Uint8Array(32).fill(0);
    contract.assignStatus(1, "pending", 1000, "CampA", "CountryX", hash, "Initial", 50, 3);
    contract.caller = "ST3FAKE";
    const result = contract.updateStatus(0, "denied", 1000, "Rejected", 30, 2);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("rejects appeal with invalid reason", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.registerVerifier();
    const hash = new Uint8Array(32).fill(0);
    contract.assignStatus(1, "denied", 1000, "CampA", "CountryX", hash, "Invalid", 20, 1);
    const result = contract.fileAppeal(0, "");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_APPEAL_REASON);
  });

  it("rejects resolve appeal if already resolved", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.registerVerifier();
    const hash = new Uint8Array(32).fill(0);
    contract.assignStatus(1, "denied", 1000, "CampA", "CountryX", hash, "Invalid", 20, 1);
    contract.fileAppeal(0, "Wrong decision");
    contract.resolveAppeal(0, false);
    const result = contract.resolveAppeal(0, true);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_APPEAL_STATUS);
  });

  it("rejects batch verify with invalid id", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.registerVerifier();
    const hash = new Uint8Array(32).fill(0);
    contract.assignStatus(1, "registered", 1000, "CampA", "CountryX", hash, "Valid", 80, 4);
    const result = contract.batchVerifyStatuses([0, 99]);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_STATUS_NOT_FOUND);
  });

  it("rejects deactivate by non-assigner", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.registerVerifier();
    const hash = new Uint8Array(32).fill(0);
    contract.assignStatus(1, "registered", 1000, "CampA", "CountryX", hash, "Valid", 80, 4);
    contract.caller = "ST3FAKE";
    const result = contract.deactivateStatus(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("returns correct status count", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.registerVerifier();
    const hash = new Uint8Array(32).fill(0);
    contract.assignStatus(1, "registered", 1000, "CampA", "CountryX", hash, "Valid", 80, 4);
    contract.assignStatus(2, "asylum-granted", 2000, "CampB", "CountryY", hash, "Approved", 90, 5);
    const result = contract.getStatusCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("rejects history limit exceed on update", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.registerVerifier();
    const hash = new Uint8Array(32).fill(0);
    contract.assignStatus(1, "pending", 1000, "CampA", "CountryX", hash, "Initial", 50, 3);
    contract.state.historyLimit = 1;
    const result = contract.updateStatus(0, "registered", 1500, "Updated", 70, 4);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_HISTORY_LIMIT);
  });
});
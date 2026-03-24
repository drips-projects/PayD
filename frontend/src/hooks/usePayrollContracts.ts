import { nativeToScVal, scValToNative, xdr } from '@stellar/stellar-sdk';
import type { ContractType } from '../services/contracts.types';
import { useSorobanContract } from './useSorobanContract';

export interface BulkPaymentResult {
  totalRecipients: number;
  successfulPayments: number;
  failedPayments: number;
  transactionHash: string;
}

export interface VestingScheduleResult {
  scheduleId: string;
  beneficiary: string;
  totalAmount: string;
  startTime: number;
  endTime: number;
  releasedAmount: string;
}

export interface RevenueSplitResult {
  roundId: string;
  totalDistributed: string;
  participantCount: number;
  transactionHash: string;
}

function parseBulkPaymentResult(raw: unknown): BulkPaymentResult {
  const data = raw as Record<string, unknown>;
  return {
    totalRecipients: Number(data?.totalRecipients ?? 0),
    successfulPayments: Number(data?.successfulPayments ?? 0),
    failedPayments: Number(data?.failedPayments ?? 0),
    transactionHash: String(data?.transactionHash ?? ''),
  };
}

function parseVestingScheduleResult(raw: unknown): VestingScheduleResult {
  const data = raw as Record<string, unknown>;
  return {
    scheduleId: String(data?.scheduleId ?? ''),
    beneficiary: String(data?.beneficiary ?? ''),
    totalAmount: String(data?.totalAmount ?? '0'),
    startTime: Number(data?.startTime ?? 0),
    endTime: Number(data?.endTime ?? 0),
    releasedAmount: String(data?.releasedAmount ?? '0'),
  };
}

function parseRevenueSplitResult(raw: unknown): RevenueSplitResult {
  const data = raw as Record<string, unknown>;
  return {
    roundId: String(data?.roundId ?? ''),
    totalDistributed: String(data?.totalDistributed ?? '0'),
    participantCount: Number(data?.participantCount ?? 0),
    transactionHash: String(data?.transactionHash ?? ''),
  };
}

export function useBulkPaymentContract(contractId: string) {
  const hook = useSorobanContract<BulkPaymentResult>(contractId);

  const distribute = async (args: { recipients: string[]; amounts: string[]; asset?: string }) => {
    return hook.invoke({
      method: 'distribute',
      args: [
        nativeToScVal(args.recipients),
        nativeToScVal(args.amounts),
        args.asset ? nativeToScVal(args.asset) : null,
      ],
      parseResult: parseBulkPaymentResult,
    });
  };

  const getPaymentStatus = async (paymentId: string) => {
    return hook.invoke({
      method: 'get_payment_status',
      args: [paymentId],
      parseResult: ((raw: unknown) => scValToNative(raw as xdr.ScVal)) as never,
    });
  };

  return { ...hook, distribute, getPaymentStatus };
}

export function useVestingEscrowContract(contractId: string) {
  const hook = useSorobanContract<VestingScheduleResult>(contractId);

  const createSchedule = async (args: {
    beneficiary: string;
    amount: string;
    startTime: number;
    endTime: number;
    cliffDuration?: number;
  }) => {
    return hook.invoke({
      method: 'create_vesting_schedule',
      args: [
        args.beneficiary,
        args.amount,
        BigInt(args.startTime),
        BigInt(args.endTime),
        BigInt(args.cliffDuration ?? 0),
      ],
      parseResult: parseVestingScheduleResult,
    });
  };

  const release = async (scheduleId: string) => {
    return hook.invoke({
      method: 'release',
      args: [scheduleId],
      parseResult: parseVestingScheduleResult,
    });
  };

  const getSchedule = async (scheduleId: string) => {
    return hook.invoke({
      method: 'get_schedule',
      args: [scheduleId],
      parseResult: parseVestingScheduleResult,
    });
  };

  return { ...hook, createSchedule, release, getSchedule };
}

export function useRevenueSplitContract(contractId: string) {
  const hook = useSorobanContract<RevenueSplitResult>(contractId);

  const createRound = async (args: {
    totalPrize: string;
    participants: string[];
    weights?: number[];
  }) => {
    return hook.invoke({
      method: 'create_round',
      args: [args.totalPrize, nativeToScVal(args.participants), nativeToScVal(args.weights ?? [])],
      parseResult: parseRevenueSplitResult,
    });
  };

  const distribute = async (roundId: string) => {
    return hook.invoke({
      method: 'distribute',
      args: [roundId],
      parseResult: parseRevenueSplitResult,
    });
  };

  const getRoundStatus = async (roundId: string) => {
    return hook.invoke({
      method: 'get_round_status',
      args: [roundId],
      parseResult: ((raw: unknown) => scValToNative(raw as xdr.ScVal)) as never,
    });
  };

  return { ...hook, createRound, distribute, getRoundStatus };
}

export function getContractHook(contractType: ContractType) {
  switch (contractType) {
    case 'bulk_payment':
      return useBulkPaymentContract;
    case 'vesting_escrow':
      return useVestingEscrowContract;
    case 'revenue_split':
      return useRevenueSplitContract;
    default:
      return useSorobanContract;
  }
}

import { Bribe, Gauge, Platform } from '../generated/schema'
import { Address, BigInt, Bytes } from '@graphprotocol/graph-ts'
import { BribeV3 } from '../generated/BribeV3/BribeV3'
import { WEEK } from './utils'

export function addBribe(
  platform: Platform,
  bribeContract: Address,
  gauge: Gauge,
  week: BigInt,
  amount: BigInt,
  token: Address,
  tx: Bytes,
  from: Address
): void {
  function syncPreviousBribe(): BigInt {
    const prevBribeId = gauge.id + '-' + platform + '-' + week.minus(WEEK).toString()
    const prevBribe = Bribe.load(prevBribeId)
    if (!prevBribe) {
      return BigInt.zero()
    }
    const contract = BribeV3.bind(bribeContract)
    const rewardBalance = contract.reward_per_gauge(Address.fromString(gauge.id), token)
    const claimed = contract.claims_per_gauge(Address.fromString(gauge.id), token)
    const remainingBalance = rewardBalance.minus(claimed)
    prevBribe.effectiveAmount = prevBribe.effectiveAmount.minus(remainingBalance)
    return remainingBalance
  }

  const bribeId = gauge.id + '-' + platform + '-' + week.toString()
  let bribe = Bribe.load(bribeId)
  if (!bribe) {
    bribe = new Bribe(bribeId)
    bribe.platform = platform.id
    bribe.gauge = gauge.id
    bribe.week = week
    bribe.token = token
    bribe.creationTx = tx
    bribe.depositor = from
    bribe.postedAmount = amount
    const leftOvers = syncPreviousBribe()
    bribe.effectiveAmount = amount.plus(leftOvers)
  } else {
    bribe.postedAmount = bribe.postedAmount.plus(amount)
    bribe.updateTx = tx
  }
}

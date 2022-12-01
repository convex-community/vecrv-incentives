import { Bribe, Claim, Gauge, Platform } from '../generated/schema'
import { log, Address, BigInt, Bytes } from '@graphprotocol/graph-ts'
import { BribeV3 } from '../generated/BribeV3/BribeV3'
import { getIntervalFromTimestamp, WEEK } from './utils'

function syncPreviousBribe(
  platform: Platform,
  gauge: Gauge,
  bribeContract: Address,
  token: Address,
  week: BigInt
): BigInt {
  const prevBribeId = gauge.id + '-' + platform.id + '-' + token.toHexString() + '-' + week.minus(WEEK).toString()
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
  log.info('New incentive added on {} for token {}', [platform.id, token.toHexString()])
  const bribeId = gauge.id + '-' + platform.id + '-' + token.toHexString() + '-' + week.toString()
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
    const leftOvers = syncPreviousBribe(platform, gauge, bribeContract, token, week)
    bribe.effectiveAmount = amount.plus(leftOvers)
  } else {
    bribe.postedAmount = bribe.postedAmount.plus(amount)
    bribe.updateTx = tx
  }
  bribe.save()
}

export function addClaim(
  platform: string,
  gauge: Bytes,
  user: Address,
  amount: BigInt,
  token: Address,
  timestamp: BigInt,
  tx: Bytes
): void {
  const week = getIntervalFromTimestamp(timestamp, WEEK)
  const bribeId = gauge.toHexString() + '-' + platform + '-' + token.toHexString() + '-' + week.toString()
  const claim = new Claim(
    platform + user.toHexString() + token.toHexString() + amount.toString() + timestamp.toString()
  )
  claim.user = user
  claim.bribe = bribeId
  claim.amount = amount
  claim.timestamp = timestamp
}

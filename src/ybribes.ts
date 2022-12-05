import { _StatsPerGauge, Bribe, Gauge, Platform } from '../generated/schema'
import { log, Address, BigInt, Bytes } from '@graphprotocol/graph-ts'
import { BribeV3 } from '../generated/BribeV3/BribeV3'
import { getIntervalFromTimestamp, WEEK } from './utils'

export function getPlatformContract(contract: string): BribeV3 {
  return BribeV3.bind(Address.fromString(contract))
}

export function getClaimsAndRewards(token: Address, gauge: Address, contract: Address): Array<BigInt> {
  const bribeContract = getPlatformContract(contract.toHexString())
  const rewardPerGauge = bribeContract.reward_per_gauge(gauge, token)
  const claimsPerGauge = bribeContract.claims_per_gauge(gauge, token)
  return [claimsPerGauge, rewardPerGauge]
}

export function updatePeriod(
  platform: string,
  contract: Address,
  gauge: Address,
  token: Address,
  user: Address,
  timestamp: BigInt,
  tx: Bytes
): BigInt {
  const week = getIntervalFromTimestamp(timestamp, WEEK)
  const bribeId = gauge.toHexString() + '-' + platform + '-' + token.toHexString() + '-' + week.toString()
  let bribe = Bribe.load(bribeId)
  let amount = BigInt.zero()
  const stats = _StatsPerGauge.load(gauge.toHexString() + token.toHexString())
  const claimsAndRewards = getClaimsAndRewards(token, gauge, contract)
  const claimsPerGauge = claimsAndRewards[0]
  const rewardPerGauge = claimsAndRewards[1]
  if (!bribe) {
    bribe = new Bribe(bribeId)
    bribe.platform = platform
    bribe.gauge = gauge.toHexString()
    bribe.week = week
    bribe.token = token
    bribe.creationTx = tx
    bribe.depositor = user
    bribe.postedAmount = rewardPerGauge

    bribe.totalClaimed = BigInt.zero()
    bribe.effectiveAmount = BigInt.zero()
    if (stats) {
      bribe.postedAmount = stats.rewardPerGauge
    }
    bribe.save()
  }
  if (stats) {
    amount = stats.rewardPerGauge.minus(rewardPerGauge)
    stats.rewardPerGauge = rewardPerGauge
    stats.claimsPerGauge = claimsPerGauge
    stats.save()
  }
  return amount
}

export function addBribe(
  platform: Platform,
  bribeContract: Address,
  gauge: Address,
  week: BigInt,
  amount: BigInt,
  token: Address,
  tx: Bytes,
  from: Address,
  contract: Address
): void {
  log.info('New incentive added on {} for token {}', [platform.id, token.toHexString()])
  const bribeId = gauge.toHexString() + '-' + platform.id + '-' + token.toHexString() + '-' + week.toString()
  let bribe = Bribe.load(bribeId)
  if (!bribe) {
    bribe = new Bribe(bribeId)
    bribe.platform = platform.id
    bribe.gauge = gauge.toHexString()
    bribe.week = week
    bribe.token = token
    bribe.creationTx = tx
    bribe.depositor = from
    bribe.postedAmount = amount
    bribe.totalClaimed = BigInt.zero()
    bribe.effectiveAmount = BigInt.zero()
  } else {
    bribe.postedAmount = bribe.postedAmount.plus(amount)
    bribe.updateTx = tx
  }
  bribe.save()
  const stats = _StatsPerGauge.load(gauge.toHexString() + token.toHexString())
  if (stats) {
    const claimsAndRewards = getClaimsAndRewards(token, gauge, contract)
    stats.claimsPerGauge = claimsAndRewards[0]
    stats.rewardPerGauge = claimsAndRewards[1]
    stats.save()
  }
}

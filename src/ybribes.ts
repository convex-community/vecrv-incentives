import { _StatsPerGauge, Bribe, Gauge, Platform } from '../generated/schema'
import { log, Address, BigInt, Bytes } from '@graphprotocol/graph-ts'
import { BribeV3 } from '../generated/BribeV3/BribeV3'
import { getIntervalFromTimestamp, WEEK } from './utils'
import { getGauge, getPlatform } from './services'

export function getPlatformContract(contract: string): BribeV3 {
  return BribeV3.bind(Address.fromString(contract))
}

export function getClaimsAndRewards(token: Address, gauge: Address, contract: Address): Array<BigInt> {
  const bribeContract = getPlatformContract(contract.toHexString())
  const rewardPerGauge = bribeContract.reward_per_gauge(gauge, token)
  const claimsPerGauge = bribeContract.claims_per_gauge(gauge, token)
  return [claimsPerGauge, rewardPerGauge]
}

export function getPreviousRollover(bribeId: string): BigInt {
  const bribe = Bribe.load(bribeId)
  if (!bribe) {
    return BigInt.zero()
  }
  return bribe.postedAmount.minus(bribe.totalClaimed)
}

export function updatePeriod(
  platform: string,
  contract: Address,
  gauge: Address,
  token: Address,
  user: Address,
  timestamp: BigInt,
  tx: Bytes,
  addReward: BigInt
): BigInt {
  // create entities if they don't exist
  getPlatform(platform)
  getGauge(gauge.toHexString())
  const newReward = addReward.gt(BigInt.zero())
  let week = getIntervalFromTimestamp(timestamp, WEEK)
  if (newReward) {
    week = week.plus(WEEK)
  }
  const bribeId = gauge.toHexString() + '-' + platform + '-' + token.toHexString() + '-' + week.toString()
  let bribe = Bribe.load(bribeId)
  let stats = _StatsPerGauge.load(gauge.toHexString() + token.toHexString())
  const claimsAndRewards = getClaimsAndRewards(token, gauge, contract)
  const claimsPerGauge = claimsAndRewards[0]
  let claimAmount = BigInt.zero()
  const rewardPerGauge = claimsAndRewards[1]

  log.error('State for {} ({}) at {} ({}), claims: {}, rewards: {}', [
    bribeId,
    contract.toHexString(),
    tx.toHexString(),
    week.toString(),
    claimsPerGauge.toString(),
    rewardPerGauge.toString(),
  ])
  // we only create a new bribe entity if a new bribe was posted
  // we'll include the rollover from previous period in it
  if (!bribe) {
    log.error('Rollover for {} ({}) at {} ({}), claims: {}, rewards: {}, addReward: {}, timestamp: {}', [
      bribeId,
      contract.toHexString(),
      tx.toHexString(),
      week.toString(),
      claimsPerGauge.toString(),
      rewardPerGauge.toString(),
      addReward ? 'Y' : 'N',
      timestamp.toString(),
    ])

    bribe = new Bribe(bribeId)
    bribe.platform = platform
    bribe.gauge = gauge.toHexString()
    bribe.week = week
    bribe.token = token
    bribe.creationTx = tx
    bribe.depositor = user
    bribe.postedAmount = BigInt.zero()
    bribe.totalClaimed = BigInt.zero()
    const previousRollover = stats ? stats.rewardPerGauge.minus(stats.claimsPerGauge) : BigInt.zero()
    bribe.previousRollover = previousRollover
    bribe.effectiveAmount = previousRollover
    if (!newReward && claimsPerGauge == BigInt.zero()) {
      return BigInt.zero()
    }
  }
  if (newReward) {
    bribe.postedAmount = addReward
    bribe.effectiveAmount = bribe.previousRollover.plus(bribe.postedAmount)
    bribe.updateTx = tx
  }
  bribe.save()

  if (stats) {
    claimAmount = claimsPerGauge.minus(stats.claimsPerGauge)
  } else {
    stats = new _StatsPerGauge(gauge.toHexString() + token.toHexString())
  }
  stats.rewardPerGauge = rewardPerGauge
  stats.claimsPerGauge = claimsPerGauge
  stats.save()
  return claimAmount
}

export function addBribe(
  platform: Platform,
  bribeContract: Address,
  gauge: Address,
  week: BigInt,
  token: Address,
  tx: Bytes,
  from: Address,
  contract: Address
): void {
  log.info('New incentive added on {} for token {}', [platform.id, token.toHexString()])
  const bribeId = gauge.toHexString() + '-' + platform.id + '-' + token.toHexString() + '-' + week.toString()
  const bribe = Bribe.load(bribeId)
  if (!bribe) {
    log.error('Impossible to load bribe {} at {}', [bribeId, tx.toHexString()])
    return
  }
  bribe.updateTx = tx
  bribe.save()
  const stats = _StatsPerGauge.load(gauge.toHexString() + token.toHexString())
  if (stats) {
    const claimsAndRewards = getClaimsAndRewards(token, gauge, contract)
    stats.claimsPerGauge = claimsAndRewards[0]
    stats.rewardPerGauge = claimsAndRewards[1]
    stats.save()
  }
}

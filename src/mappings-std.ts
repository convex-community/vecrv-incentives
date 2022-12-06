import { getGauge, getPlatform } from './services'
import { Address, BigInt, log } from '@graphprotocol/graph-ts'
import { getIntervalFromTimestamp, WEEK } from './utils'
import { BribeClosed, BribeCreated, Claimed, PeriodRolledOver, Platform } from '../generated/StakeDAO/Platform'
import { addClaim } from './common'
import { Bribe } from '../generated/schema'

const PLATFORM_NAME = 'stakeDAO'

export function handleBribeCreated(event: BribeCreated): void {
  const platform = getPlatform(PLATFORM_NAME)
  const gauge = getGauge(event.params.gauge.toHexString())
  const week = getIntervalFromTimestamp(event.block.timestamp, WEEK)
  const token = event.params.rewardToken
  const bribeId = gauge.id + '-' + platform.id + '-' + token.toHexString() + '-' + week.toString()
  let bribe = Bribe.load(bribeId)
  if (!bribe) {
    bribe = new Bribe(bribeId)
    bribe.platform = platform.id
    bribe.gauge = gauge.id
    bribe.week = week
    bribe.token = token
    bribe.creationTx = event.transaction.hash
    bribe.depositor = event.transaction.from
    bribe.postedAmount = event.params.rewardPerPeriod
    bribe.previousRollover = BigInt.zero()
    bribe.effectiveAmount = event.params.rewardPerPeriod
    bribe.totalClaimed = BigInt.zero()
  } else {
    bribe.postedAmount = bribe.postedAmount.plus(event.params.rewardPerPeriod)
    bribe.updateTx = event.transaction.hash
  }
  bribe.save()
}

export function getPlatformContract(): Platform {
  return Platform.bind(Address.fromString('0x1a8847c80fdc06b86b7b02670fdf6f7e47781594'))
}

export function getLastBribeFromStdBribeId(stdBribeId: BigInt): Bribe | null {
  const contract = getPlatformContract()
  const bribe = contract.bribes(stdBribeId)
  const endTime = bribe.getEndTimestamp()
  const gauge = bribe.getGauge()
  const token = bribe.getRewardToken()
  const bribeId = gauge.toHexString() + '-' + PLATFORM_NAME + '-' + token.toHexString() + '-' + endTime.toString()
  return Bribe.load(bribeId)
}

export function handlePeriodRolledOver(event: PeriodRolledOver): void {
  const contract = getPlatformContract()
  const bribe = contract.bribes(event.params.id)
  const gauge = bribe.getGauge()
  const token = bribe.getRewardToken()
  const week = event.params.timestamp
  const bribeIdBase = gauge.toHexString() + '-' + PLATFORM_NAME + '-' + token.toHexString()
  const bribeId = bribeIdBase + '-' + week.toString()
  const newBribe = new Bribe(bribeId)
  newBribe.gauge = gauge.toHexString()
  newBribe.platform = PLATFORM_NAME
  newBribe.week = week
  newBribe.updateTx = event.transaction.hash
  newBribe.token = token
  newBribe.postedAmount = event.params.rewardPerPeriod
  newBribe.previousRollover = BigInt.zero()
  newBribe.totalClaimed = BigInt.zero()
  newBribe.effectiveAmount = event.params.rewardPerPeriod

  const prevBribeId = bribeIdBase + '-' + week.minus(WEEK).toString()
  const prevBribe = Bribe.load(prevBribeId)
  if (prevBribe) {
    newBribe.creationTx = prevBribe.creationTx
    const periodsLeft = contract.getPeriodsLeft(event.params.id)
    const rolledOver = event.params.rewardPerPeriod.times(periodsLeft)
    prevBribe.effectiveAmount = prevBribe.effectiveAmount.minus(rolledOver)
    prevBribe.save()
  } else {
    log.error('Unable to find previous bribe {} during rollover {}', [
      prevBribeId,
      event.transaction.hash.toHexString(),
    ])
    newBribe.creationTx = event.transaction.hash
  }
}

export function handleBribeClosed(event: BribeClosed): void {
  const lastBribe = getLastBribeFromStdBribeId(event.params.id)
  if (!lastBribe) {
    log.error('Unable to find bribe {} for bribe closed event at tx {}', [
      event.params.id.toString(),
      event.transaction.hash.toHexString(),
    ])
  } else {
    lastBribe.effectiveAmount = lastBribe.effectiveAmount.minus(event.params.remainingReward)
    lastBribe.updateTx = event.transaction.hash
    lastBribe.save()
  }
}

export function handleClaimed(event: Claimed): void {
  const contract = getPlatformContract()
  const gauge = contract.bribes(event.params.bribeId).getGauge()
  addClaim(
    PLATFORM_NAME,
    gauge,
    event.params.user,
    event.params.amount,
    event.params.rewardToken,
    event.block.timestamp,
    event.transaction.hash
  )
}

import { FeeUpdated, RewardAdded } from '../generated/yBribeV3/yBribeV3'
import { getGauge, getPlatform, updatePlatformFee } from './services'
import { Address, BigInt } from '@graphprotocol/graph-ts'
import { getIntervalFromTimestamp, WEEK } from './utils'
import { addBribe, addClaim } from './ybribe'
import { Claimed, Platform } from '../generated/StakeDAO/Platform'

const PLATFORM_NAME = 'stakeDAO'

export function handleRewardAdded(event: RewardAdded): void {
  const platform = getPlatform(PLATFORM_NAME)
  const gauge = getGauge(event.params.gauge.toHexString())
  const week = getIntervalFromTimestamp(event.block.timestamp, WEEK)
  addBribe(
    platform,
    event.address,
    gauge,
    week,
    event.params.amount,
    event.params.reward_token,
    event.transaction.hash,
    event.transaction.from
  )
}

export function handleFeeUpdated(event: FeeUpdated): void {
  updatePlatformFee(PLATFORM_NAME, event.params.fee.div(BigInt.fromI32(100)))
}

export function handleClaimed(event: Claimed): void {
  const contract = Platform.bind(Address.fromString('0x1a8847c80fdc06b86b7b02670fdf6f7e47781594'))
  const gauge = contract.bribes(event.params.bribeId)
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

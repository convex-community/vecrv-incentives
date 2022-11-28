import { FeeUpdated, RewardAdded } from '../generated/yBribeV3/yBribeV3'
import { getGauge, getPlatform, updatePlatformFee } from './services'
import { BigInt } from '@graphprotocol/graph-ts'
import { getIntervalFromTimestamp, WEEK } from './utils'
import { addBribe } from './ybribe'

const PLATFORM_NAME = 'yBribe'

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

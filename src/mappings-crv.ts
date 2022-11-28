import { BribeV3, RewardAdded } from '../generated/BribeV3/BribeV3'
import { getGauge, getPlatform } from './services'
import { getIntervalFromTimestamp, WEEK } from './utils'
import { addBribe } from './ybribe'

const PLATFORM_NAME = 'bribe.crv.finance'

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

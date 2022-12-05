import { BribeV3, RewardAdded } from '../generated/BribeV3/BribeV3'
import { getGauge, getPlatform } from './services'
import { getIntervalFromTimestamp, WEEK } from './utils'
import { addBribe } from './ybribes'
import { addClaim } from './common'
import { RewardClaimed } from '../generated/BribeV3/BribeV3'
import { Address } from '@graphprotocol/graph-ts'

const PLATFORM_NAME = 'bribe.crv.finance'
const CONTRACT = Address.fromString('0x54508cbe9142de7f7d8b799743c6fe6146e98db8')

export function handleRewardAdded(event: RewardAdded): void {
  const platform = getPlatform(PLATFORM_NAME)
  getGauge(event.params.gauge.toHexString())
  const week = getIntervalFromTimestamp(event.block.timestamp, WEEK)
  addBribe(
    platform,
    event.address,
    event.params.gauge,
    week,
    event.params.amount,
    event.params.reward_token,
    event.transaction.hash,
    event.transaction.from,
    CONTRACT
  )
}

export function handleClaim(event: RewardClaimed): void {
  // need to extract the token from the transaction input
  // because the event logs the user's address instead of the reward token's
  const input = event.transaction.input.toHexString()
  const token = Address.fromString('0x' + input.slice(input.length - 40, input.length))
  addClaim(
    PLATFORM_NAME,
    event.params.gauge,
    event.params.user,
    event.params.amount,
    token,
    event.block.timestamp,
    event.transaction.hash
  )
}

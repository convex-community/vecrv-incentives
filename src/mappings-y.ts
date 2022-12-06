import { FeeUpdated, RewardAdded } from '../generated/yBribeV3/yBribeV3'
import { getGauge, getPlatform, updatePlatformFee } from './services'
import { Address, BigInt } from '@graphprotocol/graph-ts'
import { getIntervalFromTimestamp, WEEK } from './utils'
import { addBribe, updatePeriod } from './ybribes'
import { addClaim } from './common'
import { Claim_reward_for_manyCall, Claim_reward_forCall, Claim_rewardCall } from '../generated/BribeV3/BribeV3'

const PLATFORM_NAME = 'yBribe'
const CONTRACT = Address.fromString('0x03dfdbcd4056e2f92251c7b07423e1a33a7d3f6d')

export function handleRewardAdded(event: RewardAdded): void {
  updatePeriod(
    PLATFORM_NAME,
    CONTRACT,
    event.params.gauge,
    event.params.reward_token,
    event.transaction.from,
    event.block.timestamp,
    event.transaction.hash,
    event.params.amount
  )
}

export function handleFeeUpdated(event: FeeUpdated): void {
  updatePlatformFee(PLATFORM_NAME, event.params.fee.div(BigInt.fromI32(100)))
}

export function handleClaimReward(call: Claim_rewardCall): void {
  const token = call.inputs.reward_token
  const gauge = call.inputs.gauge
  const timestamp = call.block.timestamp
  const amount = updatePeriod(
    PLATFORM_NAME,
    CONTRACT,
    gauge,
    token,
    call.from,
    timestamp,
    call.transaction.hash,
    BigInt.zero()
  )

  addClaim(PLATFORM_NAME, gauge, call.from, amount, token, call.block.timestamp, call.transaction.hash)
}

export function handleClaimRewardFor(call: Claim_reward_forCall): void {
  const token = call.inputs.reward_token
  const gauge = call.inputs.gauge
  const timestamp = call.block.timestamp
  const amount = updatePeriod(
    PLATFORM_NAME,
    CONTRACT,
    gauge,
    token,
    call.inputs.user,
    timestamp,
    call.transaction.hash,
    BigInt.zero()
  )

  addClaim(PLATFORM_NAME, gauge, call.inputs.user, amount, token, call.block.timestamp, call.transaction.hash)
}

export function handleClaimRewardForMany(call: Claim_reward_for_manyCall): void {
  for (let i = 0; i < call.inputs._reward_tokens.length; i++) {
    const token = call.inputs._reward_tokens[i]
    const gauge = call.inputs._gauges[i]
    const user = call.inputs._users[i]
    const timestamp = call.block.timestamp
    const amount = updatePeriod(
      PLATFORM_NAME,
      CONTRACT,
      gauge,
      token,
      user,
      timestamp,
      call.transaction.hash,
      BigInt.zero()
    )

    addClaim(PLATFORM_NAME, gauge, user, amount, token, call.block.timestamp, call.transaction.hash)
  }
}

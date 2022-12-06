import {
  Claim_reward_for_manyCall,
  Claim_reward_forCall,
  Claim_rewardCall,
  RewardAdded,
} from '../generated/BribeV3/BribeV3'
import { updatePlatformFee } from './services'
import { updatePeriod } from './ybribes'
import { addClaim } from './common'
import { Address, BigInt } from '@graphprotocol/graph-ts'
import { FeeUpdated } from '../generated/yBribeV3/yBribeV3'

const PLATFORM_NAME = 'bribe.crv.finance'
const CONTRACT = Address.fromString('0x54508cbe9142de7f7d8b799743c6fe6146e98db8')

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

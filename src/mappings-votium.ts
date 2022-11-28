import { NewReward, UpdatedFee } from '../generated/Votium/Votium'
import { getGauge, getPlatform, updatePlatformFee } from './services'
import { Bribe } from '../generated/schema'
import { WEEK } from './utils'
import { BigInt, log } from '@graphprotocol/graph-ts'

const PLATFORM_NAME = 'Votium'

export function handleNewReward(event: NewReward): void {
  const platform = getPlatform(PLATFORM_NAME)
  const gauge = getGauge(event.params._gauge.toHexString())
  const week = event.params._week.times(WEEK)
  const bribeId = gauge.id + '-' + PLATFORM_NAME + '-' + week.toString()
  let bribe = Bribe.load(bribeId)
  log.info('New incentive added on {} for token {}', [platform.id, event.params._token.toHexString()])
  if (!bribe) {
    bribe = new Bribe(bribeId)
    bribe.platform = platform.id
    bribe.gauge = gauge.id
    bribe.week = week
    bribe.token = event.params._token
    bribe.creationTx = event.transaction.hash
    bribe.depositor = event.transaction.from
    bribe.effectiveAmount = event.params._amount
    bribe.postedAmount = event.params._amount
  } else {
    bribe.effectiveAmount = bribe.effectiveAmount.plus(event.params._amount)
    bribe.postedAmount = bribe.postedAmount.plus(event.params._amount)
    bribe.updateTx = event.transaction.hash
  }
  bribe.save()
}

export function handleUpdatedFee(event: UpdatedFee): void {
  updatePlatformFee(PLATFORM_NAME, event.params._feeAmount.div(BigInt.fromI32(10000)))
}

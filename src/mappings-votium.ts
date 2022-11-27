import { NewReward, UpdatedFee } from '../generated/Votium/Votium'
import { getGauge, getPlatform, updatePlatformFee } from './services'
import { Bribe } from '../generated/schema'
import { getIntervalFromTimestamp, WEEK } from './utils'

const PLATFORM_NAME = 'Votium'

export function handleNewReward(event: NewReward): void {
  const platform = getPlatform(PLATFORM_NAME)
  const gauge = getGauge(event.params._gauge.toHexString())
  const week = event.params._week.times(WEEK)
  const bribe = new Bribe(gauge.id + '-' + PLATFORM_NAME + '-' + event.block.timestamp)
  bribe.platform = platform.id
  bribe.gauge = gauge.id
  bribe.week = week
  bribe.amount = event.params._amount
  bribe.token = event.params._token
  bribe.creationTx = event.transaction.hash
  bribe.depositor = event.transaction.from
}

export function handleUpdatedFee(event: UpdatedFee): void {
  updatePlatformFee(PLATFORM_NAME, event.params._feeAmount)
}

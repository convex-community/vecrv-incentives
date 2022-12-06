import { getGauge, getPlatform, updatePlatformFee } from './services'
import { Bribe } from '../generated/schema'
import { getIntervalFromTimestamp, WEEK } from './utils'
import { Address, BigInt, log } from '@graphprotocol/graph-ts'
import { RewardAdded } from '../generated/PitchMoney/GaugeIncentivesStash'
import { GaugeController } from '../generated/PitchMoney/GaugeController'

const PLATFORM_NAME = 'pitch.money'

export function handleRewardAdded(event: RewardAdded): void {
  const platform = getPlatform(PLATFORM_NAME)
  updatePlatformFee(PLATFORM_NAME, BigInt.fromI32(400))
  const controller = GaugeController.bind(Address.fromString('0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB'))
  const type = controller.try_gauge_types(event.params.gauge)
  if (type.reverted) {
    return
  }
  const gauge = getGauge(event.params.gauge.toHexString())
  const week = getIntervalFromTimestamp(event.params.time, WEEK)
  const bribeId = gauge.id + '-' + PLATFORM_NAME + event.params.token.toHexString() + '-' + week.toString()
  let bribe = Bribe.load(bribeId)
  log.info('New incentive added on {} for token {}', [platform.id, event.params.token.toHexString()])
  if (!bribe) {
    bribe = new Bribe(bribeId)
    bribe.platform = platform.id
    bribe.gauge = gauge.id
    bribe.week = week
    bribe.token = event.params.token
    bribe.creationTx = event.transaction.hash
    bribe.depositor = event.transaction.from
    bribe.effectiveAmount = event.params.amount
    bribe.previousRollover = BigInt.zero()
    bribe.totalClaimed = event.params.amount
    bribe.postedAmount = event.params.amount
  } else {
    bribe.effectiveAmount = bribe.effectiveAmount.plus(event.params.amount)
    bribe.postedAmount = bribe.postedAmount.plus(event.params.amount)
    bribe.updateTx = event.transaction.hash
  }
  bribe.save()
}

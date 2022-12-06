import { Bribe, Claim } from '../generated/schema'
import { Address, BigInt, Bytes, log } from '@graphprotocol/graph-ts'
import { getIntervalFromTimestamp, WEEK } from './utils'

export function addClaim(
  platform: string,
  gauge: Bytes,
  user: Address,
  amount: BigInt,
  token: Address,
  timestamp: BigInt,
  tx: Bytes
): void {
  if (amount == BigInt.zero()) {
    return
  }
  const week = getIntervalFromTimestamp(timestamp, WEEK)
  const bribeId = gauge.toHexString() + '-' + platform + '-' + token.toHexString() + '-' + week.toString()
  const claim = new Claim(
    platform + user.toHexString() + token.toHexString() + amount.toString() + timestamp.toString()
  )
  claim.user = user
  claim.bribe = bribeId
  claim.amount = amount
  claim.tx = tx
  claim.timestamp = timestamp
  claim.save()
  const bribe = Bribe.load(bribeId)
  if (bribe) {
    bribe.totalClaimed = bribe.totalClaimed.plus(amount)
    bribe.save()
  } else {
    log.error('Unable to find bribe for claim {}, timestamp: {}, at {}', [
      bribeId,
      timestamp.toString(),
      tx.toHexString(),
    ])
  }
}

import { Gauge, Platform } from '../generated/schema'
import { Address, BigInt } from '@graphprotocol/graph-ts'

export function getPlatform(name: string): Platform {
  let platform = Platform.load(name)
  if (!platform) {
    platform = new Platform(name)
    platform.currentFee = BigInt.zero()
    platform.save()
  }
  return platform
}

export function updatePlatformFee(name: string, fee: BigInt): void {
  const platform = getPlatform(name)
  platform.currentFee = fee
  platform.save()
}

export function getGauge(address: string): Gauge {
  let gauge = Gauge.load(address)
  if (!gauge) {
    gauge = new Gauge(address)
    gauge.save()
  }
  return gauge
}

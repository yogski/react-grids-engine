import type { AbxOperations } from './types'

export type AbxPlayerConfig<
  SymbolType,
  Operations extends AbxOperations,
> = {
  id: string
  name: string
  symbol: SymbolType
  operations?: Operations
}

export class AbxPlayer<SymbolType, Operations extends AbxOperations = {}> {
  readonly id: string
  readonly name: string
  readonly symbol: SymbolType
  readonly operations: Operations

  constructor(config: AbxPlayerConfig<SymbolType, Operations>) {
    this.id = config.id
    this.name = config.name
    this.symbol = config.symbol
    this.operations = (config.operations ?? {}) as Operations
  }
}

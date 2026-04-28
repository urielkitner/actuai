/**
 * All Supabase data-access helpers for ActuAi.
 *
 * Responsibilities:
 *  - Type-safe converters between DB snake_case rows and app camelCase types
 *  - CRUD wrappers for cases and assets
 *
 * Pages import these functions instead of calling supabase directly,
 * keeping query logic out of components.
 */

import { supabase } from './supabase'

// ─── App types (used in components) ──────────────────────────────────────────

export type CaseStatus = 'open' | 'pending' | 'closed'
export type Balanceable = 'balanceable' | 'excluded'

export interface CaseSummaryRow {
  id: string
  caseNumber: string
  partyAName: string
  partyBName: string
  status: CaseStatus
  createdAt: string
  totalValueA: number
  totalValueB: number
  assetCount: number
}

export interface RealEstateRow {
  id: string; name: string; type: string; status: string
  valueA: number; valueB: number; balanceable: Balanceable
  balancePercent: number; appraisalDate: string; mortgage: number
}

export interface PensionRow {
  id: string; fundName: string; productType: string; startDate: string
  balance: number; marriagePeriodShare: number; party: 'A' | 'B'
  balanceable: Balanceable; balancePercent: number
  company: string; policyNumber: string; status: string
}

export interface BusinessRow {
  id: string; companyName: string; ownershipPercent: number; value: number
  appraised: boolean; foundedDate: string; party: 'A' | 'B'
  balanceable: Balanceable; balancePercent: number
  companyId: string; ownershipA: number; ownershipB: number
}

export interface SimpleRow {
  id: string; name: string; valueA: number; valueB: number
  balanceable: Balanceable; balancePercent: number
}

export interface VehicleRow {
  id: string; name: string; vehicleType: string; year: number
  licensePlate: string; listPrice: number; marketValue: number
  party: 'A' | 'B'; balanceable: Balanceable; balancePercent: number
}

export interface SecuritiesRow {
  id: string; name: string; securityType: string; party: 'A' | 'B'
  marketValue: number; costBasis: number; taxRate: number; expiryDate: string
  balanceable: Balanceable; balancePercent: number
}

export interface BankRow {
  id: string; name: string; accountNumber: string; accountType: string; party: 'A' | 'B'
  currency: string; balance: number; exchangeRate: number
  liquidityDate: string; interestRate: number; creditUsed: number
  balanceable: Balanceable; balancePercent: number
}

export interface Assets {
  realEstate: RealEstateRow[]
  pension: PensionRow[]
  business: BusinessRow[]
  financial: SimpleRow[]
  vehicles: VehicleRow[]
  debts: SimpleRow[]
  securities: SecuritiesRow[]
  bank: BankRow[]
}

// ─── DB row type (what Supabase returns) ─────────────────────────────────────

interface DbAsset {
  id: string
  case_id: string
  category: string
  name: string
  value_a: number
  value_b: number
  is_balanceable: boolean
  equalization_percentage: number
  asset_type: string | null
  status: string | null
  appraisal_date: string | null
  has_mortgage: boolean
  mortgage_balance: number
  party: 'A' | 'B' | null
  marriage_period_share: number | null
  ownership_percentage: number | null
  is_appraised: boolean
  founded_date: string | null
  metadata: Record<string, unknown>
}

// ─── Converters: DB → App ─────────────────────────────────────────────────────

function dbToRE(r: DbAsset): RealEstateRow {
  return {
    id: r.id,
    name: r.name,
    type: r.asset_type ?? 'residential',
    status: r.status ?? '',
    valueA: Number(r.value_a),
    valueB: Number(r.value_b),
    balanceable: r.is_balanceable ? 'balanceable' : 'excluded',
    balancePercent: Number(r.equalization_percentage),
    appraisalDate: r.appraisal_date ?? '',
    mortgage: Number(r.mortgage_balance),
  }
}

function dbToPension(r: DbAsset): PensionRow {
  const party = (r.party ?? 'A') as 'A' | 'B'
  return {
    id: r.id,
    fundName: r.name,
    productType: r.asset_type ?? 'pension',
    startDate: (r.metadata?.start_date as string) ?? '',
    balance: party === 'A' ? Number(r.value_a) : Number(r.value_b),
    marriagePeriodShare: Number(r.marriage_period_share ?? 100),
    party,
    balanceable: r.is_balanceable ? 'balanceable' : 'excluded',
    balancePercent: Number(r.equalization_percentage),
    company: (r.metadata?.company as string) ?? '',
    policyNumber: (r.metadata?.policy_number as string) ?? '',
    status: (r.metadata?.policy_status as string) ?? '',
  }
}

function dbToBusiness(r: DbAsset): BusinessRow {
  const party = (r.party ?? 'A') as 'A' | 'B'
  return {
    id: r.id,
    companyName: r.name,
    ownershipPercent: Number(r.ownership_percentage ?? 100),
    value: party === 'A' ? Number(r.value_a) : Number(r.value_b),
    appraised: r.is_appraised,
    foundedDate: r.founded_date ?? '',
    party,
    balanceable: r.is_balanceable ? 'balanceable' : 'excluded',
    balancePercent: Number(r.equalization_percentage),
    companyId: (r.metadata?.company_id as string) ?? '',
    ownershipA: Number(r.metadata?.ownership_a ?? 0),
    ownershipB: Number(r.metadata?.ownership_b ?? 0),
  }
}

function dbToSimple(r: DbAsset): SimpleRow {
  return {
    id: r.id,
    name: r.name,
    valueA: Number(r.value_a),
    valueB: Number(r.value_b),
    balanceable: r.is_balanceable ? 'balanceable' : 'excluded',
    balancePercent: Number(r.equalization_percentage),
  }
}

function dbToVehicle(r: DbAsset): VehicleRow {
  const party = (r.party ?? 'A') as 'A' | 'B'
  return {
    id: r.id,
    name: r.name,
    vehicleType: (r.metadata?.vehicle_type as string) ?? 'private',
    year: Number(r.metadata?.year ?? 0),
    licensePlate: (r.metadata?.license_plate as string) ?? '',
    listPrice: Number(r.metadata?.list_price ?? 0),
    marketValue: party === 'A' ? Number(r.value_a) : Number(r.value_b),
    party,
    balanceable: r.is_balanceable ? 'balanceable' : 'excluded',
    balancePercent: Number(r.equalization_percentage),
  }
}

function vehicleToDb(r: VehicleRow, caseId: string): Omit<DbAsset, 'metadata'> & { metadata: Record<string, unknown> } {
  return {
    id: r.id,
    case_id: caseId,
    category: 'vehicle',
    name: r.name,
    value_a: r.party === 'A' ? r.marketValue : 0,
    value_b: r.party === 'B' ? r.marketValue : 0,
    is_balanceable: r.balanceable === 'balanceable',
    equalization_percentage: r.balancePercent,
    asset_type: r.vehicleType,
    status: null,
    appraisal_date: null,
    has_mortgage: false,
    mortgage_balance: 0,
    party: r.party,
    marriage_period_share: null,
    ownership_percentage: null,
    is_appraised: false,
    founded_date: null,
    metadata: {
      vehicle_type: r.vehicleType,
      year: r.year,
      license_plate: r.licensePlate || null,
      list_price: r.listPrice,
    },
  }
}

function dbToSecurities(r: DbAsset): SecuritiesRow {
  const party = (r.party ?? 'A') as 'A' | 'B'
  return {
    id: r.id,
    name: r.name,
    securityType: (r.metadata?.security_type as string) ?? 'stocks',
    party,
    marketValue: Number(r.metadata?.market_value ?? (party === 'A' ? r.value_a : r.value_b)),
    costBasis: Number(r.metadata?.cost_basis ?? 0),
    taxRate: Number(r.metadata?.tax_rate ?? 25),
    expiryDate: (r.metadata?.expiry_date as string) ?? '',
    balanceable: r.is_balanceable ? 'balanceable' : 'excluded',
    balancePercent: Number(r.equalization_percentage),
  }
}

function dbToBank(r: DbAsset): BankRow {
  const party = (r.party ?? 'A') as 'A' | 'B'
  return {
    id: r.id,
    name: r.name,
    accountType: (r.metadata?.account_type as string) ?? 'current',
    accountNumber: (r.metadata?.account_number as string) ?? '',
    party,
    currency: (r.metadata?.currency as string) ?? '₪',
    balance: Number(r.metadata?.original_balance ?? (party === 'A' ? r.value_a : r.value_b)),
    exchangeRate: Number(r.metadata?.exchange_rate ?? 1),
    liquidityDate: (r.metadata?.liquidity_date as string) ?? '',
    interestRate: Number(r.metadata?.interest_rate ?? 0),
    creditUsed: Number(r.metadata?.credit_used ?? 0),
    balanceable: r.is_balanceable ? 'balanceable' : 'excluded',
    balancePercent: Number(r.equalization_percentage),
  }
}

// ─── Converters: App → DB ─────────────────────────────────────────────────────

function reToDb(r: RealEstateRow, caseId: string): Omit<DbAsset, 'metadata'> & { metadata: Record<string, unknown> } {
  return {
    id: r.id,
    case_id: caseId,
    category: 'real_estate',
    name: r.name,
    value_a: r.valueA,
    value_b: r.valueB,
    is_balanceable: r.balanceable === 'balanceable',
    equalization_percentage: r.balancePercent,
    asset_type: r.type || null,
    status: r.status || null,
    appraisal_date: r.appraisalDate || null,
    has_mortgage: r.mortgage > 0,
    mortgage_balance: r.mortgage,
    party: null,
    marriage_period_share: null,
    ownership_percentage: null,
    is_appraised: false,
    founded_date: null,
    metadata: {},
  }
}

function pensionToDb(r: PensionRow, caseId: string): Omit<DbAsset, 'metadata'> & { metadata: Record<string, unknown> } {
  return {
    id: r.id,
    case_id: caseId,
    category: 'pension',
    name: r.fundName,
    value_a: r.party === 'A' ? r.balance : 0,
    value_b: r.party === 'B' ? r.balance : 0,
    is_balanceable: r.balanceable === 'balanceable',
    equalization_percentage: r.balancePercent,
    asset_type: r.productType || null,
    status: null,
    appraisal_date: null,
    has_mortgage: false,
    mortgage_balance: 0,
    party: r.party,
    marriage_period_share: r.marriagePeriodShare,
    ownership_percentage: null,
    is_appraised: false,
    founded_date: null,
    metadata: {
      start_date: r.startDate || null,
      company: r.company || null,
      policy_number: r.policyNumber || null,
      policy_status: r.status || null,
    },
  }
}

function businessToDb(r: BusinessRow, caseId: string): Omit<DbAsset, 'metadata'> & { metadata: Record<string, unknown> } {
  return {
    id: r.id,
    case_id: caseId,
    category: 'business',
    name: r.companyName,
    value_a: r.party === 'A' ? r.value : 0,
    value_b: r.party === 'B' ? r.value : 0,
    is_balanceable: r.balanceable === 'balanceable',
    equalization_percentage: r.balancePercent,
    asset_type: null,
    status: null,
    appraisal_date: null,
    has_mortgage: false,
    mortgage_balance: 0,
    party: r.party,
    marriage_period_share: null,
    ownership_percentage: r.ownershipPercent,
    is_appraised: r.appraised,
    founded_date: r.foundedDate || null,
    metadata: {
      company_id: r.companyId || null,
      ownership_a: r.ownershipA,
      ownership_b: r.ownershipB,
    },
  }
}

function simpleToDb(r: SimpleRow, caseId: string, category: 'financial' | 'vehicle' | 'debt'): Omit<DbAsset, 'metadata'> & { metadata: Record<string, unknown> } {
  return {
    id: r.id,
    case_id: caseId,
    category,
    name: r.name,
    value_a: r.valueA,
    value_b: r.valueB,
    is_balanceable: r.balanceable === 'balanceable',
    equalization_percentage: r.balancePercent,
    asset_type: null,
    status: null,
    appraisal_date: null,
    has_mortgage: false,
    mortgage_balance: 0,
    party: null,
    marriage_period_share: null,
    ownership_percentage: null,
    is_appraised: false,
    founded_date: null,
    metadata: {},
  }
}

function securitiesToDb(r: SecuritiesRow, caseId: string): Omit<DbAsset, 'metadata'> & { metadata: Record<string, unknown> } {
  const capitalGain = r.marketValue - r.costBasis
  const expectedTax = capitalGain > 0 ? capitalGain * r.taxRate / 100 : 0
  const netValue = r.marketValue - expectedTax
  return {
    id: r.id,
    case_id: caseId,
    category: 'securities',
    name: r.name,
    value_a: r.party === 'A' ? netValue : 0,
    value_b: r.party === 'B' ? netValue : 0,
    is_balanceable: r.balanceable === 'balanceable',
    equalization_percentage: r.balancePercent,
    asset_type: r.securityType,
    status: null,
    appraisal_date: null,
    has_mortgage: false,
    mortgage_balance: 0,
    party: r.party,
    marriage_period_share: null,
    ownership_percentage: null,
    is_appraised: false,
    founded_date: null,
    metadata: {
      security_type: r.securityType,
      market_value: r.marketValue,
      cost_basis: r.costBasis,
      tax_rate: r.taxRate,
      expiry_date: r.expiryDate || null,
      calculated_capital_gain: capitalGain,
      calculated_tax: expectedTax,
      calculated_net_value: netValue,
    },
  }
}

function bankToDb(r: BankRow, caseId: string): Omit<DbAsset, 'metadata'> & { metadata: Record<string, unknown> } {
  const shekelValue = r.balance * r.exchangeRate
  const netBalance = shekelValue - r.creditUsed
  return {
    id: r.id,
    case_id: caseId,
    category: 'bank',
    name: r.name,
    value_a: r.party === 'A' ? netBalance : 0,
    value_b: r.party === 'B' ? netBalance : 0,
    is_balanceable: r.balanceable === 'balanceable',
    equalization_percentage: r.balancePercent,
    asset_type: r.accountType,
    status: null,
    appraisal_date: null,
    has_mortgage: false,
    mortgage_balance: 0,
    party: r.party,
    marriage_period_share: null,
    ownership_percentage: null,
    is_appraised: false,
    founded_date: null,
    metadata: {
      account_type: r.accountType,
      account_number: r.accountNumber || null,
      currency: r.currency,
      original_balance: r.balance,
      exchange_rate: r.exchangeRate,
      liquidity_date: r.liquidityDate || null,
      interest_rate: r.interestRate,
      credit_used: r.creditUsed,
      calculated_shekel_value: shekelValue,
      calculated_net_balance: netBalance,
    },
  }
}

// ─── Cases ────────────────────────────────────────────────────────────────────

/**
 * Returns the next suggested case number in AC-YYYY-NNNN format.
 * Queries all cases visible to the current user (RLS-scoped) for the current
 * year, finds the highest sequence number, and returns max+1.
 * Falls back to AC-{year}-0001 if no cases exist yet.
 */
export async function nextCaseNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `AC-${year}-`

  const { data } = await supabase
    .from('cases')
    .select('case_number')
    .like('case_number', `${prefix}%`)
    .order('case_number', { ascending: false })
    .limit(1)

  if (data && data.length > 0) {
    const last = data[0].case_number as string
    const seq = parseInt(last.replace(prefix, ''), 10)
    const next = isNaN(seq) ? 1 : seq + 1
    return `${prefix}${String(next).padStart(4, '0')}`
  }

  return `${prefix}0001`
}

export async function loadCases(): Promise<CaseSummaryRow[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('cases_summary')
    .select('*')
    .eq('actuary_id', session.user.id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map(r => ({
    id: r.id,
    caseNumber: r.case_number,
    partyAName: r.party_a_name,
    partyBName: r.party_b_name,
    status: r.status as CaseStatus,
    createdAt: r.created_at,
    totalValueA: Number(r.total_value_a ?? 0),
    totalValueB: Number(r.total_value_b ?? 0),
    assetCount: Number(r.asset_count ?? 0),
  }))
}

export async function createCase(params: {
  caseNumber: string
  partyAName: string; partyAIdNumber: string; partyABirthDate: string
  partyBName: string; partyBIdNumber: string; partyBBirthDate: string
  marriageDate: string; separationDate: string
}): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('cases')
    .insert({
      case_number: params.caseNumber,
      actuary_id: session.user.id,
      party_a_name: params.partyAName,
      party_a_id_number: params.partyAIdNumber,
      party_a_birth_date: params.partyABirthDate,
      party_b_name: params.partyBName,
      party_b_id_number: params.partyBIdNumber,
      party_b_birth_date: params.partyBBirthDate,
      marriage_date: params.marriageDate,
      separation_date: params.separationDate,
      status: 'open',
    })
    .select('id')
    .single()

  if (error) {
    // Postgres unique constraint violation
    if (error.code === '23505') {
      throw new Error('מספר תיק זה כבר קיים במערכת, אנא בחר מספר אחר')
    }
    throw new Error(error.message)
  }
  return data.id
}

export async function updateCaseStatus(caseId: string, status: CaseStatus): Promise<void> {
  const { error } = await supabase
    .from('cases')
    .update({ status })
    .eq('id', caseId)

  if (error) throw new Error(error.message)
}

// ─── Assets ───────────────────────────────────────────────────────────────────

export async function loadAssets(caseId: string): Promise<Assets> {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as DbAsset[]
  return {
    realEstate: rows.filter(r => r.category === 'real_estate').map(dbToRE),
    pension:    rows.filter(r => r.category === 'pension').map(dbToPension),
    business:   rows.filter(r => r.category === 'business').map(dbToBusiness),
    financial:  rows.filter(r => r.category === 'financial').map(dbToSimple),
    vehicles:   rows.filter(r => r.category === 'vehicle').map(dbToVehicle),
    debts:      rows.filter(r => r.category === 'debt').map(dbToSimple),
    securities: rows.filter(r => r.category === 'securities').map(dbToSecurities),
    bank:       rows.filter(r => r.category === 'bank').map(dbToBank),
  }
}

/**
 * Upsert the full asset list for a case.
 * Called when the user clicks "Next" on the assets page.
 * We upsert all current rows (insert or update by id), then delete any
 * DB rows whose id is no longer in the local list (user removed them).
 */
export async function saveAssets(caseId: string, assets: Assets): Promise<void> {
  // categories: real_estate, pension, business, financial, vehicle, debt, securities, bank
  const dbRows = [
    ...assets.realEstate.map(r => reToDb(r, caseId)),
    ...assets.pension.map(r => pensionToDb(r, caseId)),
    ...assets.business.map(r => businessToDb(r, caseId)),
    ...assets.financial.map(r => simpleToDb(r, caseId, 'financial')),
    ...assets.vehicles.map(r => vehicleToDb(r, caseId)),
    ...assets.debts.map(r => simpleToDb(r, caseId, 'debt')),
    ...assets.securities.map(r => securitiesToDb(r, caseId)),
    ...assets.bank.map(r => bankToDb(r, caseId)),
  ]

  // Delete rows that no longer exist in local state
  const keepIds = dbRows.map(r => r.id)
  const { error: delError } = await supabase
    .from('assets')
    .delete()
    .eq('case_id', caseId)
    .not('id', 'in', keepIds.length > 0 ? `(${keepIds.map(id => `"${id}"`).join(',')})` : '("")')

  if (delError) throw new Error(delError.message)

  if (dbRows.length === 0) return

  const { error: upsertError } = await supabase
    .from('assets')
    .upsert(dbRows, { onConflict: 'id' })

  if (upsertError) throw new Error(upsertError.message)
}

/**
 * Delete a single asset row immediately (used on row remove click).
 */
export async function deleteAsset(assetId: string): Promise<void> {
  const { error } = await supabase
    .from('assets')
    .delete()
    .eq('id', assetId)

  if (error) throw new Error(error.message)
}

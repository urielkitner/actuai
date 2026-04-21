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

export interface Assets {
  realEstate: RealEstateRow[]
  pension: PensionRow[]
  business: BusinessRow[]
  financial: SimpleRow[]
  vehicles: SimpleRow[]
  debts: SimpleRow[]
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
    metadata: { start_date: r.startDate || null },
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
    vehicles:   rows.filter(r => r.category === 'vehicle').map(dbToSimple),
    debts:      rows.filter(r => r.category === 'debt').map(dbToSimple),
  }
}

/**
 * Upsert the full asset list for a case.
 * Called when the user clicks "Next" on the assets page.
 * We upsert all current rows (insert or update by id), then delete any
 * DB rows whose id is no longer in the local list (user removed them).
 */
export async function saveAssets(caseId: string, assets: Assets): Promise<void> {
  const dbRows = [
    ...assets.realEstate.map(r => reToDb(r, caseId)),
    ...assets.pension.map(r => pensionToDb(r, caseId)),
    ...assets.business.map(r => businessToDb(r, caseId)),
    ...assets.financial.map(r => simpleToDb(r, caseId, 'financial')),
    ...assets.vehicles.map(r => simpleToDb(r, caseId, 'vehicle')),
    ...assets.debts.map(r => simpleToDb(r, caseId, 'debt')),
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

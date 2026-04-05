export type UserType = 'independent' | 'office'

export interface UserProfile {
  id: string
  fullName: string
  email: string
  userType: UserType
  ilaaMemeber: boolean
  idNumber?: string
}

export type CaseStatus = 'open' | 'closed' | 'pending'

export interface CaseParty {
  fullName: string
  idNumber: string
  dateOfBirth: string
}

export interface Case {
  id: string
  partyA: CaseParty
  partyB: CaseParty
  marriageDate: string
  separationDate: string
  status: CaseStatus
  createdAt: string
  userId: string
}

export type AssetBalanceable = 'balanceable' | 'excluded'

export interface RealEstateAsset {
  id: string
  caseId: string
  name: string
  type: 'residential' | 'investment' | 'construction' | 'commercial'
  status: string
  valueA: number
  valueB: number
  balanceable: AssetBalanceable
  balancePercent: number
  appraisalDate?: string
  mortgage: number
}

export type PensionProductType = 'pension' | 'gemel' | 'hishtalmut' | 'military' | 'governmental'

export interface PensionAsset {
  id: string
  caseId: string
  fundName: string
  productType: PensionProductType
  startDate: string
  balance: number
  marriagePeriodShare: number
  party: 'A' | 'B'
  balanceable: AssetBalanceable
  balancePercent: number
}

export interface BusinessAsset {
  id: string
  caseId: string
  companyName: string
  ownershipPercent: number
  value: number
  appraised: boolean
  foundedDate: string
  party: 'A' | 'B'
  balanceable: AssetBalanceable
  balancePercent: number
}

export interface SimpleAsset {
  id: string
  caseId: string
  name: string
  valueA: number
  valueB: number
  balanceable: AssetBalanceable
  balancePercent: number
}

export interface CaseAssets {
  realEstate: RealEstateAsset[]
  pension: PensionAsset[]
  business: BusinessAsset[]
  financial: SimpleAsset[]
  vehicles: SimpleAsset[]
  debts: SimpleAsset[]
}

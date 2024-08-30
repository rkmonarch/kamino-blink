export interface HyperspaceAPIResponse {
  data: {
    getMarketPlaceSnapshots: {
      market_place_snapshots: MarketPlaceSnapshotResponse[];
    };
  };
}

interface MarketPlaceSnapshotResponse {
  token_address: string;
  project_id: string;
  project_name: string;
  name: string;
  rank_est: number | null;
  moonrank: number | null;
  howrare_rank: number | null;
  solrarity_rank: number | null;
  meta_data_img: string;
  meta_data_uri: string;
  animation_url: string | null;
  is_project_verified: boolean;
  nft_standard: string;
  creator_royalty: number;
  floor_price: number | null;
  lowest_listing_mpa: MarketPlaceActionResponse | null;
  last_sale_mpa: MarketPlaceActionResponse | null;
  highest_bid_mpa: MarketPlaceActionResponse | null;
  __typename: string;
}

interface MarketPlaceActionResponse {
  user_address: string;
  price: number | null;
  marketplace_program_id: string;
  type: string;
  signature: string;
  amount: number;
  broker_referral_address: string | null;
  block_timestamp: number;
  broker_referral_fee: number | null;
  escrow_address: string;
  currency: string | null;
  currency_price: number | null;
  decimal: number | null;
  fee: number;
  marketplace_fee_address: string | null;
  marketplace_instance_id: string;
  metadata: Metadata;
  is_cross_mint_verified: boolean;
  twitter: string | null;
  backpack_username: string | null;
  website: string | null;
  domain_name: string | null;
  hyperspace_username: string | null;
  display_price: DisplayPrice;
  __typename: string;
}

interface Metadata {
  type: string;
  user?: string;
  isPool?: boolean;
  nftMint?: string;
  nftEscrow?: string | null;
  buyerPrice?: number;
  tradeState?: string;
  editionInfo?: string | null;
  metadataInfo?: string | null;
  vaultTokenAccount?: string | null;
  nftUserTokenAccount?: string | null;
  raw_inner_instruction_index: number;
  raw_outer_instruction_index: number;
  raw_price?: number;
  has_approve?: boolean;
  expiry_bytes?: number[];
  isRSOListing?: boolean;
  has_set_authority?: boolean;
  marketplace_program_id?: string;
  marketplace_instance_id?: string;
}

interface DisplayPrice {
  price: number;
  royalty: number;
  platform_fee: number;
  __typename: string;
}

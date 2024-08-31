import { connection } from "./connection";
import { Mint, getNftBuyTransaction } from "./tensor-api";

const SOURCE_TO_FEE_BPS = {
  TENSORSWAP: 150,
  TCOMP: 150,
  MAGICEDEN_V2: 250,
  default: 150,
};
const TENSOR_FEE_BPS = 150;

export async function createBuyNftTransaction(
  mint: string,
  buyerAddress: string,
  ownerAddress: string,
  royaltyBps: number,
  price: string
): Promise<string | null> {
  const blockhash = await connection
    .getLatestBlockhash({ commitment: "max" })
    .then((res) => res.blockhash);

  const totalPrice = getTotalPrice(parseInt(price, 10), royaltyBps);
  return getNftBuyTransaction({
    mintAddress: mint,
    ownerAddress: ownerAddress,
    buyerAddress: buyerAddress,
    price: totalPrice,
    latestBlockhash: blockhash,
  });
}

function getTotalPrice(price: number, royaltyBps: number): number {
  const royalty = (price * royaltyBps) / 10000;
  const marketPlaceFee = (price * TENSOR_FEE_BPS) / 10000;

  return price + royalty + marketPlaceFee;
}

export const USDollar = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
export function formatTokenAmount(num: number): string {
  if (num >= 1 && num < 1e3) {
    return removeTrailingZeros(num.toFixed(2));
  }
  if (num >= 1e3 && num < 1e6) {
    return removeTrailingZeros((num / 1e3).toFixed(1)) + "K";
  }
  if (num >= 1e6 && num < 1e9) {
    return removeTrailingZeros((num / 1e6).toFixed(1)) + "M";
  }
  if (num >= 1e9 && num < 1e12) {
    return removeTrailingZeros((num / 1e9).toFixed(1)) + "B";
  }
  if (num >= 1e12) {
    return removeTrailingZeros((num / 1e12).toFixed(1)) + "T";
  }
  return removeTrailingZeros(num.toPrecision(3));
}

function removeTrailingZeros(value: string): string {
  return value.replace(/\.?0+$/, "");
}

export async function retrieveLowestListingHash(slug: string) {
  const query = `query ActiveListingsV2(
  $slug: String!
  $sortBy: ActiveListingsSortBy!
  $filters: ActiveListingsFilters
  $limit: Int
  $cursor: ActiveListingsCursorInputV2
) {
  activeListingsV2(
    slug: $slug
    sortBy: $sortBy
    filters: $filters
    limit: $limit
    cursor: $cursor
  ) {
    txs {
      mint {
        onchainId
      }
    }
  }
}`;
  const response = await fetch("https://api.tensor.so/graphql", {
    method: "POST",
    headers: new Headers({
      "X-TENSOR-API-KEY": process.env.TENSOR_KEY || "",
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      query: query,
      variables: {
        slug: slug,
        sortBy: "PriceAsc",
        filters: {
          sources: ["TCOMP"],
        },
        limit: 1,
      },
    }),
  });
  const data = await response.json();
  console.log(data);
  if (data.data.activeListingsV2.txs.length === 0) {
    return { lowestBid: null };
  }
  return {
    lowestBid: data.data.activeListingsV2.txs[0].mint.onchainId,
  };
}

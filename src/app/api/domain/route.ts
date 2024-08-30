import {
  ActionPostRequest,
  ActionPostResponse,
  ACTIONS_CORS_HEADERS,
} from "@solana/actions";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { readFileSync } from "fs";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";
import { TldParser } from "@onsol/tldparser";
import { HyperspaceAPIResponse } from "@/utils/types";
import axios from "axios";
import { createBuyNftTransaction } from "@/utils/transaction-utils";
import { getNftInfo } from "@/utils/tensor-api";

const BASE_URL = process.env.BASE_URL || "https://alldomains.id";

type DomainCheckResponse = {
  tld: string;
  exists: boolean;
  domainPrice: { mint: string; pricing: number }[] | undefined | null;
};

async function domainCheck(handle: string): Promise<boolean> {
  const response = await fetch(`${BASE_URL}/api/check-domain/${handle}.bonk`);
  const jsonData: DomainCheckResponse = await response.json();
  if (jsonData.exists) {
    return false;
  }

  return true;
}

const connection = new Connection("https://api.mainnet-beta.solana.com");

const getAllBonkDomainsPayload = {
  operationName: "GetSimpleMarketPlaceSnapshots",
  query:
    "query GetSimpleMarketPlaceSnapshots($condition: GetMarketPlaceSnapshotCondition, $pagination_info: PaginationConfig, $order_by: [OrderConfig!]) {\n  getMarketPlaceSnapshots(\n    condition: $condition\n    pagination_info: $pagination_info\n    order_by: $order_by\n  ) {\n    market_place_snapshots {\n      token_address\n      project_id\n      project_name\n      name\n      rank_est\n      moonrank\n      howrare_rank\n      solrarity_rank\n      meta_data_img\n      meta_data_uri\n      animation_url\n      is_project_verified\n      nft_standard\n      creator_royalty\n      floor_price\n      lowest_listing_mpa {\n        user_address\n        price\n        marketplace_program_id\n        type\n        signature\n        amount\n        broker_referral_address\n        block_timestamp\n        broker_referral_fee\n        escrow_address\n        currency\n        currency_price\n        decimal\n        fee\n        marketplace_fee_address\n        marketplace_instance_id\n        metadata\n        is_cross_mint_verified\n        twitter\n        backpack_username\n        website\n        domain_name\n        hyperspace_username\n        display_price {\n          price\n          royalty\n          platform_fee\n          __typename\n        }\n        __typename\n      }\n      last_sale_mpa {\n        price\n        __typename\n      }\n      highest_bid_mpa {\n        type\n        __typename\n      }\n      __typename\n    }\n    pagination_info {\n      current_page_number\n      current_page_size\n      has_next_page\n      __typename\n    }\n    __typename\n  }\n}",
  variables: {
    condition: {
      filter_pool_listings: false,
      has_metadata: true,
      marketplace_program_condition: {
        marketplace_programs: [
          {
            marketplace_program_id:
              "TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN",
          },
          {
            marketplace_program_id:
              "hadeK9DLv9eA7ya5KCTqSvSvRZeJC3JgD5a9Y3CNbvu",
          },
          {
            marketplace_program_id:
              "2qGyiNeWyZxNdkvWHc2jT5qkCnYa1j1gDLSSUmyoWMh8",
          },
          {
            marketplace_program_id:
              "mmm3XBJg5gk8XJxEKBvdgptZz6SgK4tXvn36sodowMc",
          },
        ],
        should_exclude: true,
      },
      project_ids: [
        { project_id: "B9fB7t656KeTdaGncK1V2Vp1usyhkcN1nqWjr3NCFahb" },
      ],
    },
    order_by: { field_name: "lowest_listing_display_price", sort_order: "ASC" },
    pagination_info: { page_number: 1, page_size: 60, progressive_load: true },
  },
};

async function createAndSendTransaction(
  user: PublicKey,
  handle: string
): Promise<ActionPostResponse | null> {
  if (!(await domainCheck(handle))) {
    console.error("Domain is not available");
    return null;
  }

  try {
    const response = await fetch(`${BASE_URL}/api/create-domain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        domain: handle,
        durationRate: 1,
        tld: ".bonk",
        publicKey: user.toBase58(),
      }),
    });

    const jsonData = await response.json();

    if (jsonData.status === "error") {
      console.error(`Error: ${jsonData.error} | Message: ${jsonData.msg}`);
      return null;
    }

    const decodedInstructionBuffer = Buffer.from(
      jsonData.instructionBase64,
      "base64"
    );
    const decodedInstruction = JSON.parse(decodedInstructionBuffer.toString());

    const txInstruction = new TransactionInstruction({
      keys: decodedInstruction.keys.map((key: any) => ({
        pubkey: new PublicKey(key.pubkey),
        isSigner: key.isSigner,
        isWritable: key.isWritable,
      })),
      programId: new PublicKey(decodedInstruction.programId),
      data: Buffer.from(decodedInstruction.data, "base64"),
    });

    const transaction = new Transaction().add(txInstruction);
    transaction.feePayer = user;
    transaction.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;

    return {
      transaction: transaction
        .serialize({ requireAllSignatures: false })
        .toString("base64"),
      message: "Transaction created successfully",
    };
  } catch (error) {
    console.error("An error occurred:", error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: ActionPostRequest = await req.json();
    const handle = new URL(req.url).searchParams.get("handle");

    if (!handle) {
      return new Response("No handle provided", {
        status: 400,
        headers: ACTIONS_CORS_HEADERS,
      });
    }

    const parser = new TldParser(connection);
    const owner = await parser.getOwnerFromDomainTld(`${handle}.bonk`);

    console.log("Owner:", owner);

    // Check if the domain is available
    const available = await domainCheck(handle);

    if (!available) {
      console.log("Domain is not available");

      // Read and parse the bonkDomains.json file
      const bonkDomainsPath = join(process.cwd(), "src/utils/bonkDomains.json");
      const bonkDomains: HyperspaceAPIResponse = JSON.parse(
        readFileSync(bonkDomainsPath, "utf-8")
      );
      console.log(
        "Bonk domains:",
        bonkDomains.data.getMarketPlaceSnapshots.market_place_snapshots.length
      );

      // Find the domain in the parsed data
      const domainData =
        bonkDomains.data.getMarketPlaceSnapshots.market_place_snapshots.find(
          (snapshot) => snapshot.name === handle
        );

      if (domainData) {
        console.log("Domain found in bonkDomains.json:", domainData);

        return new Response(
          JSON.stringify({
            message: "Domain found",
            domain: domainData,
          }),
          {
            status: 200,
            headers: ACTIONS_CORS_HEADERS,
          }
        );
      } else {
        return new Response("Domain not found in bonkDomains.json", {
          status: 404,
          headers: ACTIONS_CORS_HEADERS,
        });
      }
    }

    // Proceed with minting if the domain is available
    const account = new PublicKey(body.account);
    const tx = await createAndSendTransaction(account, handle);

    if (!tx) {
      const errorPayload = {
        error: "Error creating transaction",
      };
      return new Response(JSON.stringify(errorPayload), {
        headers: ACTIONS_CORS_HEADERS,
      });
    }

    return NextResponse.json(tx);
  } catch (error) {
    console.error("An error occurred:", error);
    return new Response("Invalid request", {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }
}

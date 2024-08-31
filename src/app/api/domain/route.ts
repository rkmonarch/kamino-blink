import {
  ActionError,
  ActionGetResponse,
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
import { HyperspaceAPIResponse } from "@/utils/types";
import { createBuyNftTransaction } from "@/utils/transaction-utils";
import { findCollectionBySlug, getNftInfo } from "@/utils/tensor-api";

const BASE_URL = process.env.BASE_URL || "https://alldomains.id";

type BufferData = {
  type: "Buffer";
  data: number[];
};

type DomainExistenceInfo = {
  parentName: string;
  nclass: string;
  expiresAt: string;
  createdAt: string;
  nonTransferable: boolean;
  isValid: boolean;
  owner: string;
  expiresAtBuffer: BufferData;
  data: BufferData;
} | null;

type DomainPrice = {
  mint: string;
  pricing: number;
};

type DomainCheckResponse = {
  tld: string;
  exists: (DomainExistenceInfo | null)[];
  domainPrice: DomainPrice[] | undefined | null;
};

async function domainExists(handle: string): Promise<boolean> {
  const response = await fetch(`${BASE_URL}/api/check-domain/${handle}.bonk`);
  const jsonData: DomainCheckResponse = await response.json();
  if (jsonData.exists.length > 0 && jsonData.exists[0] !== null) {
    return true;
  }
  return false;
}

const connection = new Connection("https://api.mainnet-beta.solana.com");

async function createAndSendTransaction(
  user: PublicKey,
  handle: string
): Promise<ActionPostResponse | null> {
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

export const GET = async () => {
  const payload: ActionGetResponse = {
    icon: "https://pbs.twimg.com/profile_images/1800478667040002048/8bUg0jRH_400x400.jpg",
    description:
      "Buy .bonk domains with your SOL, if the domain is available you can buy it directly from alldomains.id or if it's taken but not listed you can buy it from tensor.",
    title: `Buy .bonk domains`,
    label: "Buy .bonk domains",
    links: {
      actions: [
        {
          href: "/api/domain?handle={handle}",
          label: "Submit",
          parameters: [
            {
              name: "handle",
              label: "Enter domain name ( without .bonk )",
            },
          ],
        },
      ],
    },
  };

  return Response.json(payload, {
    headers: ACTIONS_CORS_HEADERS,
  });
};

export async function POST(req: NextRequest) {
  try {
    const body: ActionPostRequest = await req.json();
    const handle = new URL(req.url).searchParams.get("handle");

    const account = new PublicKey(body.account);

    if (!handle) {
      return new Response("No handle provided", {
        status: 400,
        headers: ACTIONS_CORS_HEADERS,
      });
    }

    // Check if the domain is available
    const exists = await domainExists(handle);

    if (exists === true) {
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
        const nftInfo = await getNftInfo(domainData.token_address);
        console.log("NFT Info:", nftInfo && nftInfo[0]?.slugDisplay);

        if (!nftInfo) {
          return Response.json(
            {
              message: `NFT ${domainData.name} not found`,
            } satisfies ActionError,
            {
              status: 422,
            }
          );
        }

        if (!nftInfo[0].listing) {
          return Response.json(
            {
              message: `NFT ${domainData.name} is not listed`,
            } satisfies ActionError,
            {
              status: 422,
            }
          );
        }
        try {
          const collection = await findCollectionBySlug(nftInfo[0].slugDisplay);

          console.log("Collection:", collection);
          if (!collection) {
            throw new Error(`Collection ${nftInfo[0].slugDisplay} not found`);
          }

          const transaction = await createBuyNftTransaction(
            domainData.token_address,
            account.toBase58(),
            nftInfo[0].listing.seller,
            collection.sellRoyaltyFeeBPS,
            nftInfo[0].listing.price
          );

          console.log("Transaction:", transaction);

          const payload: ActionPostResponse = {
            transaction: transaction!,
            message: "Transaction created successfully",
          };

          return NextResponse.json(payload);
        } catch (error) {
          console.error("Error finding collection:", error);
        }
      } else {
        return Response.json(
          {
            message: `Domain ${handle} is taken but not listed`,
          } satisfies ActionError,
          {
            status: 422,
          }
        );
      }
    }

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

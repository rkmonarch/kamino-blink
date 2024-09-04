import { connection } from "@/utils/connection";
import {
  ACTIONS_CORS_HEADERS,
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
} from "@solana/actions";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { NextRequest, NextResponse } from "next/server";

export const GET = async () => {
  const payload: ActionGetResponse = {
    icon: "https://pbs.twimg.com/profile_images/1800478667040002048/8bUg0jRH_400x400.jpg",
    description: "Kamino",
    title: `Kamino SuperBlink`,
    label: "Kamino",
    links: {
      actions: [
        {
          href: "/api/deposit",
          label: "Deposit",
        },
        {
          href: "/api/borrow",
          label: "Borrow",
        },
        {
          href: "/api/repay",
          label: "Repay",
        },
        {
          href: "/api/withdraw",
          label: "Withdraw",
        },
      ],
    },
  };

  return Response.json(payload, {
    headers: ACTIONS_CORS_HEADERS,
  });
};

export async function POST(req: NextRequest) {
  const body: ActionPostRequest = await req.json();

  const senderPublicKey = new PublicKey(body.account);

  const recipientPublicKey = new PublicKey(
    "AwZCvM6NhcVx9y2vnyuHHnTMZYULsvLZMky5xDoBYPS2"
  );

  const transaction = new Transaction();

  const amountInLamports = 1_000_000;

  transaction.add(
    SystemProgram.transfer({
      fromPubkey: senderPublicKey,
      toPubkey: recipientPublicKey,
      lamports: amountInLamports,
    })
  );

  const blockhash = await connection.getLatestBlockhash();

  transaction.recentBlockhash = blockhash.blockhash;

  transaction.feePayer = senderPublicKey;

  const serializedTransaction = transaction
    .serialize({
      requireAllSignatures: false,
    })
    .toString("base64");

  const payload: ActionPostResponse = {
    transaction: serializedTransaction,
    message: "Success",
    links: {
      next: {
        action: {
          icon: "https://pbs.twimg.com/profile_images/1800478667040002048/8bUg0jRH_400x400.jpg",
          description: "Kamino",
          title: `Kamino SuperBlink`,
          label: "Kamino",
          type: "action",
          links: {
            actions: [
              { href: "/api/deposit", label: "Deposit" },
              { href: "/api/borrow", label: "Borrow" },
              { href: "/api/repay", label: "Repay" },
              { href: "/api/withdraw", label: "Withdraw" },
            ],
          },
        },
        type: "inline",
      },
    },
  };

  return Response.json(payload, {
    headers: ACTIONS_CORS_HEADERS,
  });
}

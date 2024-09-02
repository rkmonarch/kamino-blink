import { USDC_MINT } from "@/utils/constants";
import { loadReserveData } from "@/utils/helpers";
import {
  KaminoAction,
  PROGRAM_ID,
  VanillaObligation,
  buildVersionedTransaction,
} from "@kamino-finance/klend-sdk";
import {
  ACTIONS_CORS_HEADERS,
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
  ActionType,
} from "@solana/actions";
import { Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { NextRequest, NextResponse } from "next/server";

export const GET = async () => {
  const payload: ActionGetResponse = {
    icon: "https://pbs.twimg.com/profile_images/1800478667040002048/8bUg0jRH_400x400.jpg",
    description: "Direct lend your USDC into Kamino and earn.",
    title: `Deposit USDC`,
    label: "Deposit",
    links: {
      actions: [
        {
          href: "/api/deposit?amount={amount}",
          label: "Deposit",
          parameters: [
            {
              name: "amount",
              label: "Enter amount",
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

export const OPTIONS = GET;

export async function POST(req: NextRequest) {
  let user: PublicKey;
  const body: ActionPostRequest = await req.json();
  const amount = new URL(req.url).searchParams.get("amount");

  if (!amount) {
    return new Response("Invalid amount provided", {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }

  try {
    user = new PublicKey(body.account);
  } catch (err) {
    return new Response("Invalid account provided", {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }

  const api = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_KEY}`;

  const connection = new Connection(api);

  const { market, reserve: usdcReserve } = await loadReserveData({
    connection,
    marketPubkey: new PublicKey("7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF"), // main market address. Defaults to 'Main' market
    mintPubkey: USDC_MINT,
  });

  const depositAction = await KaminoAction.buildDepositTxns(
    market,
    new BN(parseInt(amount) * Math.pow(10, 6)),
    usdcReserve.getLiquidityMint(),
    user,
    new VanillaObligation(PROGRAM_ID),
    300_000,
    true
  );

  console.log("depositAction", depositAction);

  // eg This user has deposited jupSOL and borrowed PYUSD.
  // He is trying to deposit USDC into the reserve.

  // We refresh all the reserves in which the user has deposited collateral (jupSOL) and from which has borrowed liquidity (PYUSD) and the reserve we are looking to deposit in (USDC).

  // We refresh the obligation state to ensure the user's deposited and borrowed values are up to date.

  // We refresh the farm for the collateral before and after the deposit, to make sure the user is getting the correct amount of rewards and his new stake is reflected properly.

  console.log("depositAction.setupIxsLabels", depositAction.setupIxsLabels);
  // depositAction.setupIxsLabels [
  // 'AddComputeBudget[300000]',
  // 'RefreshReserve[DGQZWCY17gGtBUgdaFs1VreJWsodkjFxndPsskwFKGpp]',
  // 'RefreshReserve[2gc9Dm1eB6UgVYFBUN9bWks6Kes9PbWSaPaa9DqyvEiN]',
  // 'RefreshReserve[D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59]',
  // 'RefreshObligation[2CojYC9YCsYjszfRYi2AKVThg7qvfGS74Y5mLgxsNRo1w]',
  // 'RefreshFarmForObligation[Collateral, res=D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59, obl=2CojYC9YCsYjszfRYi2AKVThg7qvfGS74Y5mLgsNRo1w]']

  console.log("depositAction.lendingIxsLabels", depositAction.lendingIxsLabels);
  // depositAction.lendingIxsLabels [ 'depositReserveLiquidityAndObligationCollateral' ]

  console.log("depositAction.cleanupIxs", depositAction.cleanupIxsLabels);
  // depositAction.cleanupIxs [
  //   'RefreshFarmForObligation[Collateral, res=D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59, obl=2CojYC9YCsYjszfRYi2AKVThg7qvfGS74Y5mLgsNRo1w]'
  // ]

  const tx = await buildVersionedTransaction(connection, user, [
    ...depositAction.setupIxs,
    ...depositAction.lendingIxs,
    ...depositAction.cleanupIxs,
  ]);

  console.log("tx", tx);

  const payload: ActionPostResponse = {
    transaction: Buffer.from(tx.serialize()).toString("base64"),
    message: "Deposit USDC into the reserve",
  };

  return NextResponse.json(payload);
}

import { NextRequest, NextResponse } from "next/server";
import {
  buildVersionedTransaction,
  KaminoAction,
  PROGRAM_ID,
  VanillaObligation,
} from "@kamino-finance/klend-sdk";
import { Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import {
  ActionPostRequest,
  ActionPostResponse,
  ACTIONS_CORS_HEADERS,
} from "@solana/actions";
import { loadReserveData } from "@/utils/helpers";
import { USDC_MINT } from "@/utils/constants";

export async function POST(req: NextRequest) {
  let user: PublicKey;
  const body: ActionPostRequest = await req.json();

  try {
    user = new PublicKey(body.account);
  } catch (err) {
    return new Response("Invalid account provided", {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }

  const api = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;

  const connection = new Connection(api);
  const { market, reserve: usdcReserve } = await loadReserveData({
    connection,
    marketPubkey: new PublicKey("7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF"), // main market address. Defaults to 'Main' market
    mintPubkey: USDC_MINT,
  });

  const depositAction = await KaminoAction.buildDepositTxns(
    market,
    new BN(1_000_000),
    usdcReserve.getLiquidityMint(),
    user,
    new VanillaObligation(PROGRAM_ID),
    300_000,
    true
  );

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

import { ACTIONS_CORS_HEADERS, ActionsJson } from "@solana/actions";

export const GET = async () => {
  const payload: ActionsJson = {
    rules: [
      {
        pathPattern: "/borrow",
        apiPath: "/api/borrow",
      },
      {
        pathPattern: "/deposit",
        apiPath: "/api/deposit",
      },
      {
        pathPattern: "/domain",
        apiPath: "/api/domain",
      },
      {
        pathPattern: "/repay",
        apiPath: "/api/repay",
      },
      {
        pathPattern: "/withdraw",
        apiPath: "/api/withdraw",
      },
    ],
  };

  return Response.json(payload, {
    headers: ACTIONS_CORS_HEADERS,
  });
};

// DO NOT FORGET TO INCLUDE THE `OPTIONS` HTTP METHOD
// THIS WILL ENSURE CORS WORKS FOR BLINKS
export const OPTIONS = GET;

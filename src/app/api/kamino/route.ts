import { ACTIONS_CORS_HEADERS, ActionGetResponse, ActionPostRequest, ActionPostResponse } from "@solana/actions";
import { NextRequest, NextResponse } from "next/server";

export const GET = async () => {
    const payload: ActionGetResponse = {
        icon: "https://pbs.twimg.com/profile_images/1800478667040002048/8bUg0jRH_400x400.jpg",
        description:
            "Kamino",
        title: `Kamino SuperBlink`,
        label: "Kamino",
        links: {
            actions: [
                {
                    href: "/api/kamino",
                    label: "Deposit",
                },
                {
                    href: "/api/kamino",
                    label: "Borrow",
                },
                {
                    href: "/api/kamino",
                    label: "Repay",
                },
                {
                    href: "/api/kamino",
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

    const payload: ActionPostResponse = {
        transaction: "",
        message: "Success",
        links: {
            next: {
                action: {
                    icon: "https://pbs.twimg.com/profile_images/1800478667040002048/8bUg0jRH_400x400.jpg",
                    description:
                        "Kamino",
                    title: `Kamino SuperBlink`,
                    label: "Kamino",
                    type: "action",
                    links: {
                        actions: [
                            {
                                href: "/api/kamino",
                                label: "Deposit",
                            },
                            {
                                href: "/api/kamino",
                                label: "Borrow",
                            },
                            {
                                href: "/api/kamino",
                                label: "Repay",
                            },
                            {
                                href: "/api/kamino",
                                label: "Withdraw",
                            },
                        ],
                    },
                },
                type: "inline"
            }
        }
    };

    return NextResponse.json(payload);
}
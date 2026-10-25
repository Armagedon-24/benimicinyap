import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { IyzicoClient, IyzicoLocale } from "@/lib/iyzico";
import { securityEvent } from "@/lib/security";

// Kimlik bilgileri yalnızca env'den okunur — kaynak kodda asla tutulmaz.
// Eksikse callback fail-closed çalışır (ödeme onaylanamaz).
const iyzicoClient = process.env.IYZICO_API_KEY && process.env.IYZICO_SECRET_KEY
  ? new IyzicoClient({
      apiKey: process.env.IYZICO_API_KEY,
      secretKey: process.env.IYZICO_SECRET_KEY,
      uri: process.env.IYZICO_BASE_URL || "https://sandbox-api.iyzipay.com",
    })
  : null;

export async function POST(request: NextRequest) {
  try {
    if (!iyzicoClient) {
      await securityEvent("iyzico_callback_rejected", "IYZICO_API_KEY/SECRET tanimli degil — fail-closed");
      return NextResponse.redirect(new URL("/?payment=failed&reason=payment_provider_not_configured", request.url));
    }

    const formData = await request.formData();
    const token = formData.get("token");

    if (!token) {
      return NextResponse.redirect(new URL("/?payment=failed&reason=no_token", request.url));
    }

    // Verify token with Iyzico
    const result: any = await iyzicoClient.retrieveCheckoutForm({
      locale: IyzicoLocale.TR,
      token: token.toString()
    });

    const transactionId = result.basketId;

    if (result.status === "success" && result.paymentStatus === "SUCCESS") {
      // Find the transaction
      const transaction = await db.transaction.findUnique({
        where: { id: transactionId }
      });

      if (!transaction) {
        return NextResponse.redirect(new URL("/?payment=failed&reason=transaction_not_found", request.url));
      }

      if (transaction.status === "completed") {
        return NextResponse.redirect(new URL(`/?payment=success&amount=${transaction.amount}`, request.url));
      }

      await db.$transaction(async (tx) => {
        const claimed = await tx.transaction.updateMany({ where: { id: transactionId, status: "pending" }, data: { status: "completed" } });
        if (claimed.count !== 1) return;
        await tx.user.update({ where: { id: transaction.userId }, data: { walletBalance: { increment: transaction.amount } } });
      });

      return NextResponse.redirect(new URL(`/?payment=success&amount=${transaction.amount}`, request.url));
    } else {
      // Payment failed
      if (transactionId) {
        await db.transaction.update({
          where: { id: transactionId },
          data: { status: "failed" }
        });
      }
      return NextResponse.redirect(new URL(`/?payment=failed&reason=${encodeURIComponent(result.errorMessage || "payment_failed")}`, request.url));
    }
  } catch (error) {
    console.error("Iyzico callback error:", error);
    return NextResponse.redirect(new URL("/?payment=failed&reason=callback_error", request.url));
  }
}

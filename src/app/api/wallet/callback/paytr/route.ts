import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const merchantOid = formData.get("merchant_oid")?.toString();
    const status = formData.get("status")?.toString();
    const totalAmount = formData.get("total_amount")?.toString();
    const paytrHash = formData.get("hash")?.toString();
    const failedReasonMsg = formData.get("failed_reason_msg")?.toString();

    if (!merchantOid || !status || !totalAmount || !paytrHash) {
      return new NextResponse("Fail: Missing parameters", { status: 400 });
    }

    const merchantKey = process.env.PAYTR_MERCHANT_KEY || 'sandbox_key_here';
    const merchantSalt = process.env.PAYTR_MERCHANT_SALT || 'sandbox_salt_here';

    // Verify hash: merchant_oid + merchant_salt + status + total_amount
    const hashStr = `${merchantOid}${merchantSalt}${status}${totalAmount}`;
    const computedHash = crypto.createHmac("sha256", merchantKey).update(hashStr).digest("base64");

    if (computedHash !== paytrHash) {
      console.error("PayTR webhook signature mismatch!");
      return new NextResponse("Fail: Hash mismatch", { status: 403 });
    }

    // Find the transaction
    const transaction = await db.transaction.findUnique({
      where: { id: merchantOid }
    });

    if (!transaction) {
      console.error("PayTR transaction not found:", merchantOid);
      return new NextResponse("Fail: Transaction not found", { status: 404 });
    }

    if (status === "success") {
      if (transaction.status !== "completed") {
        // Update transaction status to completed
        await db.transaction.update({
          where: { id: merchantOid },
          data: { status: "completed" }
        });

        // Update user wallet balance
        await db.user.update({
          where: { id: transaction.userId },
          data: { walletBalance: { increment: transaction.amount } }
        });

        console.log(`PayTR payment success. Credited ${transaction.amount} to user ${transaction.userId}`);
      }
    } else {
      // Payment failed
      await db.transaction.update({
        where: { id: merchantOid },
        data: { status: "failed" }
      });
      console.log(`PayTR payment failed for transaction ${merchantOid}. Reason: ${failedReasonMsg}`);
    }

    // PayTR requires returning "OK" on success
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("PayTR webhook error:", error);
    return new NextResponse("Fail: Exception", { status: 500 });
  }
}

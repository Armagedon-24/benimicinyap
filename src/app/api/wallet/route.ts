import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCommissionSettings, calculateWithdrawFee } from "@/lib/commission";
import { IyzicoClient, IyzicoLocale, IyzicoCurrency, IyzicoPaymentGroup, IyzicoBasketItemType } from "@/lib/iyzico";
import crypto from "crypto";
import { requireUser } from "@/lib/security";

// Kimlik bilgileri yalnızca env'den okunur — kaynak kodda asla tutulmaz.
// Eksikse ödeme başlatma adımı erken reddedilir (fail-closed).
const iyzicoClient = process.env.IYZICO_API_KEY && process.env.IYZICO_SECRET_KEY
  ? new IyzicoClient({
      apiKey: process.env.IYZICO_API_KEY,
      secretKey: process.env.IYZICO_SECRET_KEY,
      uri: process.env.IYZICO_BASE_URL || "https://sandbox-api.iyzipay.com",
    })
  : null;

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth.response) return auth.response;
    const body = await request.json();
    const { action } = body;

    if (action === "initialize_payment") {
      const { amount, provider } = body;
      const userId = auth.user!.id;

      if (!userId || !amount || !provider) {
        return NextResponse.json(
          { success: false, message: "Zorunlu alanlar: userId, amount, provider" },
          { status: 400 }
        );
      }

      const numericAmount = Number(amount);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return NextResponse.json(
          { success: false, message: "Tutar sıfırdan büyük olmalıdır" },
          { status: 400 }
        );
      }

      const user = (await db.user.findUnique({ where: { id: userId } })) as any;
      if (!user) {
        return NextResponse.json(
          { success: false, message: "Kullanıcı bulunamadı" },
          { status: 404 }
        );
      }

      // Create a pending transaction
      const transaction = await db.transaction.create({
        data: {
          userId,
          amount: numericAmount,
          type: "wallet_load",
          status: "pending",
          taskTitle: `${provider.toUpperCase()} Bakiye Yükleme`,
        },
      });

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://benimicinyap.vercel.app";
      const userIp = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "85.105.105.105";

      if (provider === "iyzico") {
        if (!iyzicoClient) {
          return NextResponse.json(
            { success: false, message: "Ödeme sağlayıcısı yapılandırılmamış. Lütfen yönetici ile iletişime geçin." },
            { status: 503 }
          );
        }
        const iyziRequest = {
          locale: IyzicoLocale.TR,
          conversationId: transaction.id,
          price: numericAmount.toFixed(2),
          paidPrice: numericAmount.toFixed(2),
          currency: IyzicoCurrency.TRY,
          basketId: transaction.id,
          paymentGroup: IyzicoPaymentGroup.PRODUCT,
          callbackUrl: `${appUrl}/api/wallet/callback/iyzico`,
          enabledInstallments: [1, 2, 3, 6, 9],
          buyer: {
            id: user.id,
            name: user.fullName.split(' ')[0] || 'Kullanici',
            surname: user.fullName.split(' ').slice(1).join(' ') || 'Soyadi',
            gsmNumber: '+905300000000',
            email: user.email,
            identityNumber: user.tcNo || '11111111111',
            lastLoginDate: '2026-07-17 12:00:00',
            registrationDate: '2026-07-17 12:00:00',
            registrationAddress: user.city || 'Antalya',
            ip: userIp,
            city: user.city || 'Antalya',
            country: 'Turkey',
            zipCode: '07100'
          },
          shippingAddress: {
            contactName: user.fullName,
            city: user.city || 'Antalya',
            country: 'Turkey',
            address: user.city || 'Antalya',
            zipCode: '07100'
          },
          billingAddress: {
            contactName: user.fullName,
            city: user.city || 'Antalya',
            country: 'Turkey',
            address: user.city || 'Antalya',
            zipCode: '07100'
          },
          basketItems: [
            {
              id: 'BI101',
              name: 'Cüzdan Bakiye Yükleme',
              category1: 'Cüzdan',
              itemType: IyzicoBasketItemType.VIRTUAL,
              price: numericAmount.toFixed(2)
            }
          ]
        };

        let result: any;
        try {
          result = await iyzicoClient.initializeCheckoutForm(iyziRequest);
        } catch (err: any) {
          console.error("Iyzico init API error:", err);
          return NextResponse.json(
            { success: false, message: err.message || "Iyzico ödeme başlatılamadı" },
            { status: 500 }
          );
        }

        if (result.status === "success" && result.paymentPageUrl) {
          return NextResponse.json({
            success: true,
            provider: "iyzico",
            paymentPageUrl: result.paymentPageUrl,
            token: result.token,
          });
        } else {
          console.error("Iyzico init response status error:", result);
          return NextResponse.json(
            { success: false, message: result.errorMessage || "Iyzico ödeme başlatılamadı" },
            { status: 500 }
          );
        }
      }



      return NextResponse.json(
        { success: false, message: "Geçersiz ödeme sağlayıcısı" },
        { status: 400 }
      );
    }

    if (action === "load") {
      const { amount, cardId } = body;
      const userId = auth.user!.id;

      if (!userId || !amount || !cardId) {
        return NextResponse.json(
          {
            success: false,
            message: "Zorunlu alanlar: userId, amount, cardId",
          },
          { status: 400 }
        );
      }

      const numericAmount = Number(amount);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return NextResponse.json(
          { success: false, message: "Yüklenme tutarı sıfırdan büyük olmalıdır" },
          { status: 400 }
        );
      }

      const card = await db.paymentCard.findFirst({ where: { id: cardId, userId } });
      if (!card) {
        return NextResponse.json({ success: false, message: "Kart kullanıcıya ait değil" }, { status: 403 });
      }

      // Add to wallet
      const { updatedUser, transaction } = await db.$transaction(async (tx) => {
        const updatedUser = await tx.user.update({ where: { id: userId }, data: { walletBalance: { increment: numericAmount } } });
        const transaction = await tx.transaction.create({ data: { userId, amount: numericAmount, type: "wallet_load", status: "completed" } });
        return { updatedUser, transaction };
      });

      const { password: _, ...userWithoutPassword } = updatedUser;

      return NextResponse.json({
        success: true,
        user: userWithoutPassword,
        transaction,
      });
    }

    if (action === "withdraw") {
      const { amount, bankName, iban, accountName } = body;
      const userId = auth.user!.id;

      if (!userId || !amount || !bankName || !iban || !accountName) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Zorunlu alanlar: userId, amount, bankName, iban, accountName",
          },
          { status: 400 }
        );
      }

      // Check user exists and balance
      const user = (await db.user.findUnique({ where: { id: userId } })) as any;
      if (!user) {
        return NextResponse.json(
          { success: false, message: "Kullanıcı bulunamadı" },
          { status: 404 }
        );
      }

      const numericAmount = Number(amount);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return NextResponse.json({ success: false, message: "Çekim tutarı geçersiz" }, { status: 400 });
      }
      const settings = await getCommissionSettings();
      const withdrawFee = calculateWithdrawFee(numericAmount, settings);
      const totalDeduction = numericAmount + withdrawFee;

      if (user.walletBalance < totalDeduction) {
        return NextResponse.json(
          { success: false, message: `Yetersiz bakiye. Çekim tutarı (${amount} ₺) + işlem ücreti (${withdrawFee.toFixed(2)} ₺) = ${totalDeduction.toFixed(2)} ₺` },
          { status: 400 }
        );
      }

      // Deduct from wallet (amount + fee)
      const { updatedUser, transaction } = await db.$transaction(async (tx) => {
        const updatedUser = await tx.user.updateMany({ where: { id: userId, walletBalance: { gte: totalDeduction } }, data: { walletBalance: { decrement: totalDeduction } } });
        if (updatedUser.count !== 1) throw new Error("Insufficient wallet balance");
        const transaction = await tx.transaction.create({ data: { userId, amount: numericAmount, platformFee: withdrawFee, type: "wallet_withdraw", status: "completed", taskTitle: `${bankName} - ${iban} - ${accountName}` } });
        const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
        return { updatedUser: user, transaction };
      });

      const { password: _, ...userWithoutPassword } = updatedUser;

      return NextResponse.json({
        success: true,
        user: userWithoutPassword,
        transaction,
      });
    }

    return NextResponse.json(
      { success: false, message: "Geçersiz işlem. 'load' veya 'withdraw' kullanın." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Wallet error:", error);
    return NextResponse.json(
      { success: false, message: "Cüzdan işlemi sırasında hata oluştu" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth.response) return auth.response;
    const { searchParams } = new URL(request.url);
    const userId = auth.user!.id;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "userId parametresi zorunludur" },
        { status: 400 }
      );
    }

    const transactions = await db.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, transactions });
  } catch (error) {
    console.error("Wallet GET error:", error);
    return NextResponse.json(
      { success: false, message: "İşlemler listelenirken hata oluştu" },
      { status: 500 }
    );
  }
}
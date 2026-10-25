import crypto from "crypto";

export interface IyzicoConfig {
  apiKey: string;
  secretKey: string;
  uri: string;
}

export const IyzicoLocale = {
  TR: "tr",
  EN: "en",
};

export const IyzicoCurrency = {
  TRY: "TRY",
  EUR: "EUR",
  USD: "USD",
};

export const IyzicoPaymentGroup = {
  PRODUCT: "PRODUCT",
  LISTING: "LISTING",
  SUBSCRIPTION: "SUBSCRIPTION",
};

export const IyzicoBasketItemType = {
  PHYSICAL: "PHYSICAL",
  VIRTUAL: "VIRTUAL",
};

export class IyzicoClient {
  private config: IyzicoConfig;

  constructor(config: IyzicoConfig) {
    this.config = {
      apiKey: config.apiKey,
      secretKey: config.secretKey,
      uri: config.uri.replace(/\/+$/, ""), // strip trailing slashes
    };
  }

  private generateRandomString(size = 8): string {
    // Generate a random string similar to process.hrtime()[0] + Math.random().toString(size).slice(2)
    const hrTime = process.hrtime();
    const hrString = hrTime[0].toString() + hrTime[1].toString();
    return hrString + Math.random().toString(size).slice(2);
  }

  private generateAuthorizationHeader(path: string, body: any, randomString: string): string {
    const signature = crypto
      .createHmac("sha256", this.config.secretKey)
      .update(randomString + path + JSON.stringify(body))
      .digest("hex");

    const authParams = [
      `apiKey:${this.config.apiKey}`,
      `randomKey:${randomString}`,
      `signature:${signature}`
    ];
    
    const base64Auth = Buffer.from(authParams.join("&")).toString("base64");
    return `IYZWSv2 ${base64Auth}`;
  }

  private async request(path: string, body: any): Promise<any> {
    const randomString = this.generateRandomString();
    const authHeader = this.generateAuthorizationHeader(path, body, randomString);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-iy-client-version": "iyzipay-node-2.0.69",
      "x-iyzi-rnd": randomString,
      "Authorization": authHeader,
    };

    const response = await fetch(`${this.config.uri}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Iyzico API request failed: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  async initializeCheckoutForm(request: any): Promise<any> {
    return this.request("/payment/iyzipos/checkoutform/initialize/auth/ecom", request);
  }

  async retrieveCheckoutForm(request: any): Promise<any> {
    return this.request("/payment/iyzipos/checkoutform/auth/ecom/detail", request);
  }
}

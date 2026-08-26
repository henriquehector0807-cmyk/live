import { v4 as uuidv4 } from "uuid";

export interface CreatePixPaymentInput {
  amount: number;
  description: string;
  payer: {
    email: string;
    name: string;
    cpf: string;
  };
  externalReference: string;
  notificationUrl?: string;
}

export interface PixPaymentResult {
  id: string;
  status: string;
  statusDetail?: string;
  qrCode?: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
  raw?: any;
}

export class MercadoPagoService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken.trim();
  }

  /**
   * Test if the provided access token is valid
   */
  async testCredentials(): Promise<{ valid: boolean; message: string; user?: any }> {
    try {
      const response = await fetch("https://api.mercadopago.com/users/me", {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          valid: false,
          message: errorData.message || `Erro ${response.status}: Token inválido ou expirado`,
        };
      }

      const userData = await response.json();
      return {
        valid: true,
        message: "Credenciais válidas e conectadas com sucesso!",
        user: {
          id: userData.id,
          nickname: userData.nickname,
          email: userData.email,
          countryId: userData.country_id,
        },
      };
    } catch (error: any) {
      return {
        valid: false,
        message: error.message || "Erro de conexão ao testar credenciais do Mercado Pago",
      };
    }
  }

  /**
   * Create a PIX instant payment
   */
  async createPixPayment(input: CreatePixPaymentInput): Promise<PixPaymentResult> {
    const cleanCpf = (input.payer.cpf || "").replace(/\D/g, "");
    
    // Split name into first and last name
    const nameParts = (input.payer.name || "Comprador").trim().split(" ");
    const firstName = nameParts[0] || "Comprador";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Cliente";

    const email = input.payer.email && input.payer.email.includes("@") 
      ? input.payer.email.trim() 
      : `comprador_${Date.now()}@livecommerce.com`;

    const body: any = {
      transaction_amount: Number(Number(input.amount).toFixed(2)),
      description: input.description.slice(0, 120),
      payment_method_id: "pix",
      payer: {
        email,
        first_name: firstName,
        last_name: lastName,
        identification: cleanCpf.length === 11 ? {
          type: "CPF",
          number: cleanCpf,
        } : undefined,
      },
      external_reference: input.externalReference,
    };

    if (input.notificationUrl && input.notificationUrl.startsWith("http")) {
      body.notification_url = input.notificationUrl;
    }

    const idempotencyKey = uuidv4();

    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[MercadoPago Create Error]", response.status, data);
      const errMsg = data.message || data.cause?.[0]?.description || "Erro ao gerar PIX no Mercado Pago";
      throw new Error(errMsg);
    }

    const transactionData = data.point_of_interaction?.transaction_data;

    return {
      id: String(data.id),
      status: data.status,
      statusDetail: data.status_detail,
      qrCode: transactionData?.qr_code,
      qrCodeBase64: transactionData?.qr_code_base64,
      ticketUrl: transactionData?.ticket_url,
      raw: data,
    };
  }

  /**
   * Get payment details and current status
   */
  async getPayment(paymentId: string | number): Promise<{
    id: string;
    status: string;
    statusDetail?: string;
    isApproved: boolean;
    amount?: number;
    externalReference?: string;
    raw?: any;
  }> {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erro ${response.status} ao consultar pagamento`);
    }

    const data = await response.json();

    return {
      id: String(data.id),
      status: data.status,
      statusDetail: data.status_detail,
      isApproved: data.status === "approved",
      amount: data.transaction_amount,
      externalReference: data.external_reference,
      raw: data,
    };
  }
}

/**
 * Cliente Getnet Chile — PlacetoPay Redirection API
 *
 * Auth: cada request incluye un bloque { login, tranKey, nonce, seed }
 * donde tranKey = Base64(SHA-256(nonce + seed + rawTranKey))
 *
 * Docs: Manual_Integracion_API_2_3.pdf (Santander/Getnet Chile)
 */

import { randomBytes, createHash } from 'node:crypto';

function baseUrl() {
  return (process.env.GETNET_BASE_URL ?? 'https://checkout.test.getnet.cl').replace(/\/$/, '');
}

function buildAuth() {
  const login = process.env.GETNET_LOGIN!;
  const rawTranKey = process.env.GETNET_TRANKEY!;

  if (!login || !rawTranKey) throw new Error('Faltan credenciales Getnet (GETNET_LOGIN / GETNET_TRANKEY)');

  // Fórmula verificada: SHA-256(rawNonce || seed || secretKey)
  // El nonce va como bytes raw en el hash, pero como base64 en el campo auth
  const rawNonce = randomBytes(16);
  const nonce = rawNonce.toString('base64');
  const seed = new Date().toISOString();
  const tranKey = createHash('sha256')
    .update(Buffer.concat([rawNonce, Buffer.from(seed + rawTranKey)]))
    .digest('base64');

  return { login, tranKey, nonce, seed };
}

export interface SesionGetnet {
  requestId: number;
  processUrl: string; // URL a la que redirigir al cliente
}

export interface EstadoPago {
  requestId: number;
  estado: string;    // 'APPROVED' | 'REJECTED' | 'PENDING' | ...
  pagado: boolean;
  orderId: string;
  monto: number;
}

/**
 * Crea una sesión de pago y devuelve el processUrl para redirigir al cliente.
 */
export async function crearSesion(params: {
  orderId: string;
  monto: number;       // pesos CLP sin decimales
  descripcion: string;
  returnUrl: string;
  cancelUrl: string;
  ipAddress?: string;
}): Promise<SesionGetnet> {
  const body = {
    auth: buildAuth(),
    payment: {
      reference: params.orderId,
      description: params.descripcion
        .normalize('NFD').replace(/[̀-ͯ]/g, '') // quita tildes
        .replace(/[^a-zA-Z0-9 ,.\-]/g, '')               // solo ASCII seguro
        .slice(0, 100) || 'Pedido Santo Grill',
      amount: { currency: 'CLP', total: params.monto },
    },
    expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
    returnUrl: params.returnUrl,
    cancelUrl: params.cancelUrl,
    ipAddress: params.ipAddress ?? '127.0.0.1',
    userAgent: 'SantoGrill/1.0 Node.js',
  };

  const res = await fetch(`${baseUrl()}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = await res.json() as {
    status?: { status: string; message: string };
    requestId?: number;
    processUrl?: string;
  };

  if (!res.ok || json.status?.status !== 'OK') {
    throw new Error(`Getnet error: ${json.status?.message ?? res.status}`);
  }

  return {
    requestId: json.requestId!,
    processUrl: json.processUrl!,
  };
}

/**
 * Consulta el estado de una sesión por requestId.
 */
export async function consultarSesion(requestId: string | number): Promise<EstadoPago> {
  const body = { auth: buildAuth() };

  const res = await fetch(`${baseUrl()}/api/session/${requestId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = await res.json() as {
    status?: { status: string; message?: string };
    requestId?: number;
    payment?: Array<{
      status?: { status: string };
      reference?: string;
      amount?: { total: number };
    }>;
  };

  console.log(`[Getnet] consultarSesion(${requestId}) HTTP=${res.status} estado=${json.status?.status} msg=${json.status?.message} pagos=${json.payment?.length ?? 0}`);

  // La fuente de verdad es el estado de la SESIÓN, no el de cada intento.
  // Si hubo un rechazo seguido de un aprobado, json.status.status = "APPROVED".
  const sesionEstado = json.status?.status ?? 'PENDING';
  const pagado = /^(APPROVED|APPROVED_PARTIAL)$/i.test(sesionEstado);

  // Para orderId y monto, buscamos el pago aprobado (el último o el que tenga APPROVED)
  const pagos: Array<{ status?: { status?: string }; reference?: string; amount?: { total?: number } }> =
    Array.isArray(json.payment) ? json.payment : [];
  const pagoAprobado =
    pagos.find((p) => /^(APPROVED|APPROVED_PARTIAL)$/i.test(p?.status?.status ?? '')) ??
    pagos[pagos.length - 1] ??
    null;

  return {
    requestId: json.requestId ?? Number(requestId),
    estado: sesionEstado,
    pagado,
    orderId: pagoAprobado?.reference ?? '',
    monto: pagoAprobado?.amount?.total ?? 0,
  };
}

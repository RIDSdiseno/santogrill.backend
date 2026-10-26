import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { clp } from '../utils/precios.js';

interface Correo { to: string; subject: string; html: string; }

function smtpTransporter() {
  return nodemailer.createTransport({
    host: env.SMTP_HOST ?? 'smtp.gmail.com',
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
  });
}

async function enviar(correo: Correo) {
  if (env.MAIL_PROVIDER === 'none') {
    logger.info({ to: correo.to, subject: correo.subject }, 'MAIL_PROVIDER=none: correo no enviado');
    return;
  }

  try {
    if (env.MAIL_PROVIDER === 'smtp') {
      const transporter = smtpTransporter();
      await transporter.sendMail({ from: env.MAIL_FROM, ...correo });
      logger.info({ to: correo.to, subject: correo.subject }, 'Correo enviado (SMTP)');
      return;
    }

    if (env.MAIL_PROVIDER === 'resend' && env.RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: env.MAIL_FROM, ...correo })
      });
      if (!res.ok) logger.error({ status: res.status }, 'Fallo al enviar correo (Resend)');
      else logger.info({ to: correo.to, subject: correo.subject }, 'Correo enviado (Resend)');
    }
  } catch (err) {
    logger.error({ err }, 'Error al enviar correo');
  }
}

const equipoTo = () => env.NOTIFICATION_EMAIL ?? env.MAIL_TO_EQUIPO;

type PedidoCompleto = {
  numero: string;
  clienteNombre: string;
  clienteFono: string;
  clienteEmail?: string | null;
  direccion?: string | null;
  comuna?: string | null;
  subtotal: number;
  descuento: number;
  envio: number;
  total: number;
  items: Array<{ cantidad: number; nombreProducto: string; precioUnitario: number }>;
};

function tablaItems(items: PedidoCompleto['items']) {
  return items.map((i) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #2c2926">${i.nombreProducto}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #2c2926;text-align:center">${i.cantidad}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #2c2926;text-align:right">${clp(i.precioUnitario)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #2c2926;text-align:right;font-weight:bold">${clp(i.precioUnitario * i.cantidad)}</td>
    </tr>`).join('');
}

function htmlPedido(pedido: PedidoCompleto, titulo: string, color: string) {
  return `
  <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#f1efec;border-radius:12px;overflow:hidden">
    <div style="background:${color};padding:24px 28px">
      <h1 style="margin:0;font-size:22px;letter-spacing:0.06em">${titulo}</h1>
      <p style="margin:6px 0 0;font-size:28px;font-weight:900">${pedido.numero}</p>
    </div>

    <div style="padding:24px 28px">
      <h3 style="color:#8e8882;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 12px">CLIENTE</h3>
      <table style="width:100%;font-size:14px;border-collapse:collapse">
        <tr><td style="padding:4px 0;color:#8e8882;width:110px">Nombre</td><td style="font-weight:bold">${pedido.clienteNombre}</td></tr>
        <tr><td style="padding:4px 0;color:#8e8882">WhatsApp</td><td>${pedido.clienteFono}</td></tr>
        ${pedido.clienteEmail ? `<tr><td style="padding:4px 0;color:#8e8882">Email</td><td>${pedido.clienteEmail}</td></tr>` : ''}
        ${pedido.direccion ? `<tr><td style="padding:4px 0;color:#8e8882">Dirección</td><td>${pedido.direccion}${pedido.comuna ? ', ' + pedido.comuna : ''}</td></tr>` : ''}
      </table>

      <h3 style="color:#8e8882;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;margin:24px 0 12px">PRODUCTOS</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="background:#141312">
            <th style="padding:8px 12px;text-align:left;color:#8e8882;font-weight:600">Producto</th>
            <th style="padding:8px 12px;text-align:center;color:#8e8882;font-weight:600">Cant.</th>
            <th style="padding:8px 12px;text-align:right;color:#8e8882;font-weight:600">Precio</th>
            <th style="padding:8px 12px;text-align:right;color:#8e8882;font-weight:600">Subtotal</th>
          </tr>
        </thead>
        <tbody>${tablaItems(pedido.items)}</tbody>
      </table>

      <table style="width:100%;font-size:14px;margin-top:16px">
        <tr><td style="padding:4px 0;color:#8e8882">Subtotal</td><td style="text-align:right">${clp(pedido.subtotal)}</td></tr>
        ${pedido.descuento > 0 ? `<tr><td style="padding:4px 0;color:#f58220">Descuento suscriptor</td><td style="text-align:right;color:#f58220">− ${clp(pedido.descuento)}</td></tr>` : ''}
        <tr><td style="padding:4px 0;color:#8e8882">Envío</td><td style="text-align:right">${pedido.envio === 0 ? 'Gratis' : clp(pedido.envio)}</td></tr>
        <tr style="border-top:2px solid #2c2926">
          <td style="padding:12px 0 0;font-size:18px;font-weight:900">TOTAL</td>
          <td style="padding:12px 0 0;text-align:right;font-size:22px;font-weight:900;color:${color}">${clp(pedido.total)}</td>
        </tr>
      </table>
    </div>
  </div>`;
}

export const mailService = {
  async avisarPedido(pedido: PedidoCompleto) {
    await enviar({
      to: equipoTo(),
      subject: `🔥 Nuevo pedido ${pedido.numero} — ${clp(pedido.total)}`,
      html: htmlPedido(pedido, '🔥 NUEVO PEDIDO', '#f58220'),
    });
  },

  async avisarPagoAprobado(pedido: PedidoCompleto) {
    await enviar({
      to: equipoTo(),
      subject: `✅ Pago aprobado ${pedido.numero} — ${clp(pedido.total)}`,
      html: htmlPedido(pedido, '✅ PAGO APROBADO (Getnet)', '#22c55e'),
    });
  },

  async avisarMensaje(m: { nombre: string; email: string; texto: string }) {
    await enviar({
      to: equipoTo(),
      subject: `Nueva consulta de ${m.nombre}`,
      html: `<p><strong>${m.nombre}</strong> (${m.email})</p><p>${m.texto}</p>`,
    });
  },

  async avisarEvento(e: {
    codigo: string; nombre: string; telefono?: string | null; email?: string | null;
    servicio: string; fechaEvento?: Date | null; lugar?: string | null; personas?: number | null; detalle?: string | null;
  }) {
    const fecha = e.fechaEvento ? e.fechaEvento.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
    await enviar({
      to: equipoTo(),
      subject: `📋 Nueva cotización ${e.codigo} — ${e.nombre}`,
      html: `
        <h2 style="color:#f58220">Nueva cotización: ${e.codigo}</h2>
        <table style="border-collapse:collapse;width:100%;font-size:14px">
          <tr><td style="padding:6px 0;color:#888">Nombre</td><td><strong>${e.nombre}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#888">Teléfono</td><td>${e.telefono ?? '—'}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Email</td><td>${e.email ?? '—'}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Servicio</td><td>${e.servicio}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Fecha evento</td><td>${fecha}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Lugar</td><td>${e.lugar ?? '—'}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Personas</td><td>${e.personas ?? '—'}</td></tr>
          ${e.detalle ? `<tr><td style="padding:6px 0;color:#888">Detalle</td><td>${e.detalle}</td></tr>` : ''}
        </table>
      `,
    });
  },

  async avisarReserva(r: {
    codigo: string; nombre: string; telefono?: string | null;
    tipo: string; fecha: Date; horaInicio: string; horaFin: string; servicio?: string | null;
  }) {
    const fechaStr = r.fecha.toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    await enviar({
      to: equipoTo(),
      subject: `📅 Nueva reserva ${r.codigo} — ${r.nombre}`,
      html: `
        <h2 style="color:#f58220">Nueva reserva: ${r.codigo}</h2>
        <table style="border-collapse:collapse;width:100%;font-size:14px">
          <tr><td style="padding:6px 0;color:#888">Nombre</td><td><strong>${r.nombre}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#888">Teléfono</td><td>${r.telefono ?? '—'}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Tipo</td><td>${r.tipo}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Fecha</td><td>${fechaStr}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Horario</td><td>${r.horaInicio} a ${r.horaFin} hrs</td></tr>
          ${r.servicio ? `<tr><td style="padding:6px 0;color:#888">Servicio</td><td>${r.servicio}</td></tr>` : ''}
        </table>
      `,
    });
  },

  async bienvenidaSuscriptor(s: { nombre: string; email: string }) {
    await enviar({
      to: s.email,
      subject: '¡Bienvenido a Santo Grill! Tu 5% está activo',
      html: `<p>Hola ${s.nombre},</p><p>Tu descuento de 5% quedó activo. Úsalo con este mismo correo al hacer tu pedido.</p>`,
    });
  },
};

const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Envía el correo de confirmación y entrega de boletos digitales al usuario.
 * @param {Object} order - Objeto de la orden con event, customerName, orderNumber, etc.
 * @param {Array} tickets - Lista de boletos generados con sus códigos y asientos.
 */
const sendTicketsEmail = async (order, tickets) => {
  try {
    const frontendUrl = process.env.FRONTEND_URL;
    const event = order.event;

    // Generar la lista HTML de los boletos con sus botones de acceso rápido
    const ticketsHtmlList = tickets
      .map(
        (ticket, index) => `
      <div style="background-color: #FAF9FA; border: 1px solid #FFD9E2; border-radius: 16px; padding: 20px; margin-bottom: 16px; text-align: center;">
        <p style="font-family: Montserrat, sans-serif; font-weight: 800; color: #E01883; font-size: 14px; margin: 0 0 8px 0; text-transform: uppercase;">
          Boleto #${index + 1} • ${order.ticketType?.name || "VIP"}
        </p>
        <p style="font-family: Poppins, sans-serif; font-size: 13px; color: #6D5D63; margin: 0 0 12px 0;">
          Folio: <strong>${ticket.ticketCode}</strong> ${ticket.seatNumber ? `| Asiento: <strong>${ticket.seatNumber}</strong>` : ""}
        </p>
        <a href="${frontendUrl}/ticket/${ticket.ticketCode}" 
           style="background-color: #E01883; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 10px; font-family: Montserrat, sans-serif; font-weight: 800; font-size: 13px; display: inline-block; box-shadow: 0 4px 12px rgba(224, 24, 131, 0.2);">
          Ver mi Boleto Digital QR
        </a>
      </div>
    `,
      )
      .join("");

    // Estructura HTML de la plantilla
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Tus Entradas - Eventos Wapizima</title>
        </head>
        <body style="background-color: #FAF9FA; margin: 0; padding: 0; font-family: Poppins, Arial, sans-serif; color: #2C2124;">
          <div style="max-width: 600px; margin: 0 auto; padding: 24px; background-color: #ffffff; border-radius: 24px; border: 1px solid rgba(224, 24, 131, 0.15); margin-top: 20px; margin-bottom: 20px;">
            
            <!-- Cabecera -->
            <div style="text-align: center; border-bottom: 2px solid #FFF0F5; padding-bottom: 20px; margin-bottom: 24px;">
              <h1 style="font-family: Montserrat, sans-serif; color: #E01883; font-size: 24px; font-weight: 900; margin: 0;">
                Eventos Wapizima
              </h1>
              <p style="font-size: 14px; color: #6D5D63; margin: 4px 0 0 0;">¡Tus accesos están listos!</p>
            </div>

            <!-- Saludo -->
            <h2 style="font-family: Montserrat, sans-serif; color: #2C2124; font-size: 18px; font-weight: 800;">
              ¡Hola, ${order.customerName || "Wapizima Lover"}!
            </h2>
            <p style="font-size: 14px; color: #5C4B51; line-height: 1.6;">
              Tu orden con folio <strong>${order.orderNumber}</strong> ha sido liquidada exitosamente. Nos emociona mucho compartir contigo esta gran experiencia.
            </p>

            <!-- Detalles del Evento -->
            <div style="background-color: #FFF0F5; border-radius: 16px; padding: 16px; border: 1px solid #FFD9E2; margin-bottom: 24px;">
              <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Evento:</strong> ${event?.title}</p>
              <p style="margin: 0 0 8px 0; font-size: 14px;">📍 <strong>Sede:</strong> ${event?.location}</p>
              <p style="margin: 0; font-size: 14px;">📅 <strong>Fecha:</strong> ${new Date(event?.startDate).toLocaleDateString("es-MX", { dateStyle: "long" })}</p>
            </div>

            <h3 style="font-family: Montserrat, sans-serif; color: #2C2124; font-size: 16px; font-weight: 800; margin-bottom: 16px;">
              Tus Pases de Acceso:
            </h3>

            <!-- Lista de Boletos -->
            ${ticketsHtmlList}

            <!-- Nota de Cierre -->
            <p style="font-size: 12px; color: gray; text-align: center; margin-top: 32px; border-top: 1px solid #eeeeee; padding-top: 16px;">
              Si tienes dudas o problemas con tus accesos, puedes consultarlos directamente en tu perfil en <a href="${frontendUrl}/mi-perfil" style="color: #E01883; text-decoration: none;">Eventos Wapizima</a>.<br>
              Este es un correo automático, por favor no respondas a este mensaje.
            </p>
          </div>
        </body>
      </html>
    `;

    // Envío del correo con Resend
    const data = await resend.emails.send({
      from: "Eventos Wapizima <no-reply@eventoswapizima.com>", // Asegúrate de usar un dominio verificado en Resend
      to: order.customerEmail,
      subject: `¡Tus boletos para ${event?.title} ya están listos! 🎟️`,
      html: htmlContent,
    });
    return { success: true, data };
  } catch (error) {
    console.error("Error crítico al enviar el correo con Resend:", error);
    return { success: false, error };
  }
};

module.exports = { sendTicketsEmail };

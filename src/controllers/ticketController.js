const { Ticket, Order, Event, sequelize } = require("../models");

exports.validateTicket = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { code } = req.body;

    if (!code) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Se requiere el código del boleto para validar.",
      });
      4;
    }

    // Buscar el boleto junto con su orden y evento
    const ticket = await Ticket.findOne({
      where: { ticketCode: code },
      include: [
        {
          model: Order,
          as: "order",
          include: [{ model: Event, as: "event" }],
        },
      ],
      transaction,
    });

    if (!ticket) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        statusType: "INVALID",
        message: "El boleto no existe en el sistema.",
      });
    }

    // Verificar si la orden está liquidada o activa de manera correcta
    if (ticket.order.status !== "completed") {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        statusType: "UNPAID",
        message:
          "Acceso denegado: La orden asociada no está totalmente liquidada.",
      });
    }

    // Verificar si el boleto ya fue utilizado previamente
    if (ticket.status === "used") {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        statusType: "ALREADY_USED",
        message: `⚠️ ADVERTENCIA: Este boleto ya fue escaneado y utilizado anteriormente.`,
        ticketData: ticket,
      });
    }

    // Marcar el boleto como utilizado
    ticket.status = "used";
    await ticket.save({ transaction });

    await transaction.commit();

    return res.status(200).json({
      success: true,
      statusType: "SUCCESS",
      message: "¡Acceso concedido con éxito!",
      ticketData: ticket,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error al validar el boleto:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno al procesar la validación.",
    });
  }
};

const {
  Reservation,
  Event,
  TicketType,
  Transaction,
  Order,
  Ticket,
} = require("../models");

/**
 * Consultar todas las reservaciones asociadas a un correo
 */
exports.getReservationsByEmail = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "El parámetro email es requerido",
      });
    }

    const reservations = await Reservation.findAll({
      where: { customerEmail: email.trim().toLowerCase() },
      include: [
        { model: Event, as: "event" },
        { model: TicketType, as: "ticketType" },
        { model: Transaction, as: "transactions" },
        {
          model: Order,
          as: "order",
          include: [{ model: Ticket, as: "tickets" }],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({ success: true, data: reservations });
  } catch (error) {
    console.error("Error al consultar reservaciones:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error al obtener la información" });
  }
};

/**
 * Obtener detalle de una reservación por Código de Folio
 */
exports.getReservationByCode = async (req, res) => {
  try {
    const { code } = req.params;

    const reservation = await Reservation.findOne({
      where: { reservationCode: code },
      include: [
        { model: Event, as: "event" },
        { model: TicketType, as: "ticketType" },
        { model: Transaction, as: "transactions" },
        {
          model: Order,
          as: "order",
          include: [{ model: Ticket, as: "tickets" }],
        },
      ],
    });

    if (!reservation) {
      return res
        .status(404)
        .json({ success: false, message: "Reservación no encontrada" });
    }

    return res.status(200).json({ success: true, data: reservation });
  } catch (error) {
    console.error("Error al buscar folio:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error interno del servidor" });
  }
};

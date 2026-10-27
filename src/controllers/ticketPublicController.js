const { Ticket, Order, Event, TicketType } = require("../models");
exports.getTicketByCode = async (req, res) => {
  try {
    const { code } = req.params;

    const ticket = await Ticket.findOne({
      where: { ticketCode: code },
      include: [
        {
          model: Order,
          as: "order",
          include: [
            { model: Event, as: "event" },
            { model: TicketType, as: "ticketType" },
          ],
        },
      ],
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "El boleto no existe o es inválido.",
      });
    }

    return res.status(200).json(ticket);
  } catch (error) {
    console.error("Error al buscar boleto público:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error al consultar el boleto." });
  }
};

const { Event, TicketType, Ticket, Order, sequelize } = require("../models");
const { Op } = require("sequelize");

const getEventOverview = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Buscamos el evento con sus tipos de boletos y las órdenes/boletos asociados
    const event = await Event.findOne({
      where: { id, deletedAt: null },
      include: [
        {
          model: TicketType,
          as: "ticketTypes",
          attributes: ["id", "name", "price", "totalQuantity"],
          include: [
            {
              model: Ticket,
              as: "tickets",
              attributes: ["id", "status"],
              where: { status: { [Op.not]: "cancelled" } },
              required: false,
            },
          ],
        },
        {
          model: Order,
          as: "orders",
          attributes: ["id", "totalPaid", "balancePending", "status"],
          where: { status: { [Op.not]: "cancelled" } },
          required: false,
        },
      ],
    });

    if (!event) {
      return res.status(404).json({ message: "Evento no encontrado" });
    }

    const eventJson = event.toJSON();

    // 2. Calculamos Finanzas (Ingresos totales y saldo pendiente)
    let totalRevenue = 0;
    let pendingBalance = 0;

    if (eventJson.orders) {
      eventJson.orders.forEach((order) => {
        totalRevenue += Number(order.totalPaid || 0);
        pendingBalance += Number(order.balancePending || 0);
      });
    }

    // 3. Calculamos Capacidad Total y Boletos Vendidos generales
    let totalCapacity = 0;
    let soldTickets = 0;

    const ticketTypesBreakdown = eventJson.ticketTypes.map((tType) => {
      const capacity = Number(tType.totalQuantity || 0);
      const sold = tType.tickets ? tType.tickets.length : 0;

      totalCapacity += capacity;
      soldTickets += sold;

      return {
        id: tType.id,
        name: tType.name,
        price: tType.price,
        sold,
        capacity,
      };
    });

    const occupancyPercentage =
      totalCapacity > 0
        ? Math.min(100, Math.round((soldTickets / totalCapacity) * 100))
        : 0;

    return res.status(200).json({
      totalRevenue,
      pendingBalance,
      soldTickets,
      totalCapacity,
      occupancyPercentage,
      ticketTypesBreakdown,
    });
  } catch (error) {
    console.error("Error al obtener el resumen del evento:", error);
    return res
      .status(500)
      .json({ message: "Error al obtener las métricas del evento" });
  }
};

getOrdersByEventId = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscamos el evento con sus órdenes asociadas
    const event = await Event.findOne({
      where: { id, deletedAt: null },
      include: [
        {
          model: Order,
          as: "orders",
          attributes: [
            "id",
            "orderNumber",
            "totalPaid",
            "balancePending",
            "totalAmount",
            "status",
            "quantity",
            "customerName",
            "customerEmail",
            "createdAt",
          ],
          where: { status: { [Op.not]: "cancelled" } },
          required: false,
        },
      ],
    });

    if (!event) {
      return res.status(404).json({ message: "Evento no encontrado" });
    }

    const eventJson = event.toJSON();

    return res.status(200).json({
      orders: eventJson.orders || [],
    });
  } catch (error) {
    console.error("Error al obtener las órdenes del evento:", error);
    return res
      .status(500)
      .json({ message: "Error al obtener las órdenes del evento" });
  }
};

module.exports = {
  getEventOverview,
  getOrdersByEventId,
};

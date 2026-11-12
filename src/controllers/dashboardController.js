const dayjs = require("dayjs");
const {
  Order,
  Ticket,
  Event,
  sequelize,
  TicketType,
  Payment,
} = require("../models");
const { Op } = require("sequelize");

const getDashboardMetrics = async (req, res) => {
  try {
    // 1. Total Ingresos Cobrados (suma de abonos/pagos completados)
    const totalRevenueResult = await Order.sum("totalPaid", {
      where: { status: { [Op.or]: ["active_plan", "completed"] } },
    });

    // 2. Total Saldo Pendiente por cobrar (Planes de Pago activos)
    const totalPendingBalanceResult = await Order.sum("balancePending", {
      where: { status: "active_plan" },
    });

    // 3. Conteo Total de Boletos Vendidos
    const totalTicketsSold = await Ticket.count({
      where: { status: { [Op.not]: "cancelled" } },
    });

    // 4. Conteo de Eventos Activos / Publicados
    const activeEventsCount = await Event.count({
      where: { status: "published", deletedAt: null },
    });

    return res.status(200).json({
      totalRevenue: totalRevenueResult || 0,
      totalPendingBalance: totalPendingBalanceResult || 0,
      totalTicketsSold: totalTicketsSold || 0,
      activeEventsCount: activeEventsCount || 0,
    });
  } catch (error) {
    console.error("Error al obtener métricas del dashboard:", error);
    return res
      .status(500)
      .json({ message: "Error al obtener métricas financieras" });
  }
};
const getLatestOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      limit: 10,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Event,
          as: "event",
          attributes: ["id", "title"],
        },
        {
          model: Ticket,
          as: "tickets",
          attributes: ["id"],
        },
      ],
    });

    const formattedOrders = orders.map((order) => {
      const orderData = order.toJSON();
      const balancePending = Number(orderData.balancePending || 0);

      return {
        id: orderData.id,
        buyerName: orderData.customerName || "Cliente",
        buyerEmail: orderData.customerEmail || "Sin correo",
        eventTitle: orderData.event?.title || "Evento no especificado",
        ticketCount: orderData.tickets ? orderData.tickets.length : 0,
        // Si el saldo pendiente es mayor a 0 se clasifica como Plan de Pagos
        paymentType: balancePending > 0 ? "Plan de Pagos" : "Pago de Contado",
        totalAmount: orderData.totalAmount || orderData.total || 0,
        amountPaid: orderData.totalPaid || 0,
        balancePending: balancePending,
        status: orderData.status,
        createdAt: orderData.createdAt,
      };
    });

    return res.status(200).json(formattedOrders);
  } catch (error) {
    console.error("Error al obtener las últimas órdenes:", error);
    return res
      .status(500)
      .json({ message: "Error al obtener las últimas órdenes registradas" });
  }
};

const getSalesAnalytics = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;

    // 1. Inicio exacto del día (00:00:00) en hora CDMX
    const startDate = dayjs()
      .tz("America/Mexico_City")
      .subtract(days - 1, "day")
      .startOf("day")
      .toDate();

    // 2. Fin exacto del día (23:59:59.999) en hora CDMX
    const endDateObj = dayjs().tz("America/Mexico_City").endOf("day");
    const endDateForSequelize = endDateObj.toDate();

    const payments = await Payment.findAll({
      where: {
        status: "succeeded",
        createdAt: {
          [Op.between]: [startDate, endDateForSequelize],
        },
      },
      attributes: ["id", "amount", "createdAt"],
      order: [["createdAt", "ASC"]],
    });

    const salesMap = {};
    for (let i = 0; i < days; i++) {
      const dateKey = dayjs()
        .tz("America/Mexico_City")
        .subtract(days - 1 - i, "day")
        .format("YYYY-MM-DD");
      salesMap[dateKey] = 0;
    }

    payments.forEach((payment) => {
      // Forzamos la lectura de la fecha del pago en horario de CDMX para agruparla en el día correcto
      const dateKey = dayjs(payment.createdAt)
        .tz("America/Mexico_City")
        .format("YYYY-MM-DD");

      if (salesMap[dateKey] !== undefined) {
        salesMap[dateKey] += Number(payment.amount || 0);
      }
    });

    const formattedData = Object.keys(salesMap).map((date) => ({
      date: dayjs(date).format("DD MMM"),
      total: Number(salesMap[date].toFixed(2)),
    }));

    return res.status(200).json(formattedData);
  } catch (error) {
    console.error("Error al obtener analítica de pagos:", error);
    return res.status(500).json({ message: "Error al generar la analítica" });
  }
};

const getEventsOccupancy = async (req, res) => {
  try {
    const events = await Event.findAll({
      where: { status: "published", deletedAt: null },
      include: [
        {
          model: TicketType,
          as: "ticketTypes",
          attributes: ["id", "totalQuantity"],
          include: [
            {
              model: Ticket,
              as: "tickets", // Boletos reales emitidos/comprados
              attributes: ["id"],
              where: { status: { [Op.not]: "cancelled" } },
              required: false,
            },
          ],
        },
      ],
    });

    const occupancyData = events.map((event) => {
      const eventJson = event.toJSON();

      // 1. Capacidad total sumando totalQuantity de cada TicketType
      const totalCapacity = eventJson.ticketTypes.reduce(
        (sum, tType) => sum + Number(tType.totalQuantity || 0),
        0,
      );

      // 2. Total de boletos vendidos sumando la cantidad de boletos en cada TicketType
      const soldCount = eventJson.ticketTypes.reduce((sum, tType) => {
        const ticketList = Array.isArray(tType.tickets) ? tType.tickets : [];
        return sum + ticketList.length;
      }, 0);

      // 3. Porcentaje de ocupación
      const occupancyPercentage =
        totalCapacity > 0
          ? Math.min(100, Math.round((soldCount / totalCapacity) * 100))
          : 0;

      return {
        id: eventJson.id,
        title: eventJson.title,
        totalCapacity,
        soldCount,
        occupancyPercentage,
      };
    });

    return res.status(200).json(occupancyData);
  } catch (error) {
    console.error("Error al calcular la ocupación de eventos:", error);
    return res
      .status(500)
      .json({ message: "Error al obtener el aforo de eventos" });
  }
};

module.exports = {
  getDashboardMetrics,
  getLatestOrders,
  getSalesAnalytics,
  getEventsOccupancy,
};

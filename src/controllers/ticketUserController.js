const {
  Order,
  Event,
  Ticket,
  Payment,
  TicketType,
  Coupon,
} = require("../models");
const getOrdersByUser = async (req, res) => {
  try {
    const { userId } = req.query;
    const orders = await Order.findAll({
      where: { userId: userId },
      include: [
        {
          model: Event,
          as: "event",
          attributes: ["title", "startDate", "location"],
        },
        {
          model: Ticket,
          as: "tickets",
          attributes: ["status", "id", "ticketCode"],
        },
        {
          model: TicketType,
          as: "ticketType",
          attributes: ["price", "color", "name"],
        },
        {
          model: Payment,
          as: "payments",
          attributes: ["status", "paymentMethod"],
        },
        {
          model: Coupon,
          as: "coupon",
          attributes: ["code", "discountType", "discountValue"],
        },
      ],
    });
    return res.status(200).json(orders);
  } catch (error) {
    console.log(error);

    return res
      .status(500)
      .json({ message: "Hubo un error al listar", error: error });
  }
};

const getShowOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findByPk(id, {
      include: [
        {
          model: Event,
          as: "event",
          attributes: ["title", "startDate", "location"],
        },
        {
          model: Ticket,
          as: "tickets",
          attributes: ["status", "id", "ticketCode"],
        },
        {
          model: TicketType,
          as: "ticketType",
          attributes: ["price", "color", "name"],
        },
        {
          model: Payment,
          as: "payments",
          attributes: ["status", "paymentMethod", "amount", "createdAt"],
        },
        {
          model: Coupon,
          as: "coupon",
          attributes: ["code", "discountType", "discountValue"],
        },
      ],
    });
    return res.status(200).json(order);
  } catch (error) {
    console.log(error, "Hubo un error al hacer el show de la orden");
    return res
      .status(500)
      .json({ message: "Upps! Fallo la consulta", error: error });
  }
};

module.exports = { getOrdersByUser, getShowOrder };

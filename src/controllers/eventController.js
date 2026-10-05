const {
  Event,
  EventCoverImage,
  EventPaymentPlan,
  EventInstallmentRule,
  TicketType,
  sequelize,
} = require("../models");

/**
 * Obtener lista de eventos activos
 */
const getAllEvents = async (req, res) => {
  try {
    const events = await Event.findAll({
      where: { status: "published" },
      include: [
        { model: EventCoverImage, as: "coverImage" },
        { model: TicketType, as: "ticketTypes" },
        {
          model: EventPaymentPlan,
          as: "paymentPlan",
          include: [{ model: EventInstallmentRule, as: "installmentRules" }],
        },
      ],
      order: [["eventDate", "ASC"]],
    });

    return res.status(200).json({ success: true, data: events });
  } catch (error) {
    console.error("Error al obtener eventos:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error interno del servidor" });
  }
};

/**
 * Obtener detalle de un evento por ID o Slug
 */
const getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findByPk(id, {
      include: [
        { model: EventCoverImage, as: "coverImage" },
        { model: TicketType, as: "ticketTypes" },
        {
          model: EventPaymentPlan,
          as: "paymentPlan",
          include: [{ model: EventInstallmentRule, as: "installmentRules" }],
        },
      ],
    });

    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Evento no encontrado" });
    }

    return res.status(200).json({ success: true, data: event });
  } catch (error) {
    console.error("Error al obtener detalle del evento:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error interno del servidor" });
  }
};

/**
 * Crear Evento completo con Portada, Tipos de Boletos y Plan de Pagos
 */
const createEvent = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      title,
      description,
      venueName,
      venueAddress,
      eventDate,
      coverImageUrl,
      ticketTypes, // Array de tipos de boletos
      paymentPlan, // Objeto con reglas de apartado
    } = req.body;

    // 1. Crear Evento
    const newEvent = await Event.create(
      { title, description, venueName, venueAddress, eventDate },
      { transaction },
    );

    // 2. Crear Imagen de Portada (si existe URL de S3)
    if (coverImageUrl) {
      await EventCoverImage.create(
        { eventId: newEvent.id, imageUrl: coverImageUrl },
        { transaction },
      );
    }

    // 3. Crear Tipos de Boletos
    if (ticketTypes && ticketTypes.length > 0) {
      const ticketsData = ticketTypes.map((t) => ({
        ...t,
        eventId: newEvent.id,
      }));
      await TicketType.bulkCreate(ticketsData, { transaction });
    }

    // 4. Crear Plan de Pagos y Cuotas
    if (paymentPlan) {
      const newPlan = await EventPaymentPlan.create(
        {
          eventId: newEvent.id,
          initialDeposit: paymentPlan.initialDeposit,
          minPaymentAmount: paymentPlan.minPaymentAmount,
          finalDueDate: paymentPlan.finalDueDate,
        },
        { transaction },
      );

      if (paymentPlan.rules && paymentPlan.rules.length > 0) {
        const rulesData = paymentPlan.rules.map((r) => ({
          ...r,
          eventPaymentPlanId: newPlan.id,
        }));
        await EventInstallmentRule.bulkCreate(rulesData, { transaction });
      }
    }

    await transaction.commit();
    return res.status(201).json({
      success: true,
      message: "Evento creado exitosamente",
      data: { eventId: newEvent.id },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error al crear evento:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error al registrar el evento" });
  }
};

module.exports = {
  getAllEvents,
  getEventById,
  createEvent,
};

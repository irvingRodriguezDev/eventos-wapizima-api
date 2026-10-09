const { uploadToS3 } = require("../middlewares/uploadImage");
const {
  Event,
  EventImage,
  EventPaymentPlan,
  EventInstallmentRule,
  TicketType,
  sequelize,
} = require("../models");
const slugify = require("slugify");
const getS3Url = require("../helpers/getS3Url");
/**
 * Obtener lista de eventos activos
 */
const getAllEvents = async (req, res) => {
  try {
    const events = await Event.findAll({
      where: { deletedAt: null },
      include: [
        {
          model: EventImage,
          as: "image",
          attributes: ["id", "s3Key"],
        },
        { model: TicketType, as: "ticketTypes" },
        {
          model: EventPaymentPlan,
          as: "paymentPlan",
          include: [{ model: EventInstallmentRule, as: "installmentRules" }],
        },
      ],
      order: [["startDate", "ASC"]],
    });
    const formattedEvents = events.map((event) => {
      const eventData = event.toJSON();
      return {
        ...eventData,
        image: eventData.image ? getS3Url(eventData.image.s3Key) : null,
      };
    });

    return res.status(200).json(formattedEvents);
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
const getEventBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const event = await Event.findOne({
      where: { slug, deletedAt: null },
      include: [
        { model: EventImage, as: "image" },
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

    return res.status(200).json(event);
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
      location,
      mapa,
      startDate,
      endDate,
      totalTickets,
      price,
      allowsPaymentPlan,
      minDepositAmount,
      status,
    } = req.body;
    // 1. Crear Evento
    const slug = slugify(title, { lower: true, strict: true });
    const newEvent = await Event.create(
      {
        title,
        slug,
        description,
        location,
        mapa,
        startDate,
        endDate,
        totalTickets,
        price,
        allowsPaymentPlan,
        minDepositAmount,
        status,
      },
      { transaction },
    );

    // 2. Crear Imagen de Portada (si existe URL de S3)
    if (req.file) {
      try {
        const s3Url = await uploadToS3(
          "eventoswapizima/events",
          req.file,
          newEvent.id,
        );

        await EventImage.create(
          { eventId: newEvent.id, s3Key: s3Url },
          { transaction },
        );
      } catch (s3Error) {
        console.error("Error subiendo a s3", s3Error);
        await transaction.rollback();
        return res.status(500).json({
          message: "Error al guardar la imagen en S3",
          error: s3Error.message,
        });
      }
    }

    // 3. Crear Tipos de Boletos
    // if (ticketTypes && ticketTypes.length > 0) {
    //   const ticketsData = ticketTypes.map((t) => ({
    //     ...t,
    //     eventId: newEvent.id,
    //   }));
    //   await TicketType.bulkCreate(ticketsData, { transaction });
    // }

    // 4. Crear Plan de Pagos y Cuotas
    // if (paymentPlan) {
    //   const newPlan = await EventPaymentPlan.create(
    //     {
    //       eventId: newEvent.id,
    //       initialDeposit: paymentPlan.initialDeposit,
    //       minPaymentAmount: paymentPlan.minPaymentAmount,
    //       finalDueDate: paymentPlan.finalDueDate,
    //     },
    //     { transaction },
    //   );

    //   if (paymentPlan.rules && paymentPlan.rules.length > 0) {
    //     const rulesData = paymentPlan.rules.map((r) => ({
    //       ...r,
    //       eventPaymentPlanId: newPlan.id,
    //     }));
    //     await EventInstallmentRule.bulkCreate(rulesData, { transaction });
    //   }
    // }

    await transaction.commit();
    return res.status(201).json({
      success: true,
      message: "Evento creado exitosamente",
      eventId: newEvent.id,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error al crear evento:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error al registrar el evento" });
  }
};
//Funcion para publicar un evento, asegurando que tenga un plan de pagos configurado antes de hacerlo disponible para la venta
const publishEvent = async (req, res) => {
  // Iniciamos una transacción de BD
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { hasPaymentPlan, paymentPlan } = req.body; // Recibimos la estructura del plan de pagos

    const event = await Event.findByPk(id, { transaction: t });

    if (!event) {
      await t.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Evento no encontrado" });
    }

    // Validar que se envíen hitos si se indicó que el evento maneja plan de pagos
    if (
      hasPaymentPlan &&
      (!paymentPlan ||
        !paymentPlan.milestones ||
        paymentPlan.milestones.length === 0)
    ) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Debe incluir al menos un hito en el plan de pagos.",
      });
    }

    // 1. Crear o actualizar el Plan de Pagos asociado al evento
    if (hasPaymentPlan) {
      // Eliminar plan anterior si se está reconfigurando
      await EventPaymentPlan.destroy({
        where: { eventId: id },
        transaction: t,
      });

      // Insertar los hitos/milestones del plan de pagos
      const planRecords = paymentPlan.milestones.map((item, index) => ({
        eventId: id,
        step: index + 1,
        concept: item.concept,
        amount: parseFloat(item.amount) || 0,
        note: item.note || "",
      }));

      await EventPaymentPlan.bulkCreate(planRecords, { transaction: t });
    }

    // 2. Cambiar el estatus del evento a publicado
    event.status = "published";
    await event.save({ transaction: t });

    // Confirmar cambios en la base de datos
    await t.commit();

    // Consultar el evento actualizado con su plan de pagos para la respuesta
    const updatedEvent = await Event.findByPk(id, {
      include: [{ model: EventPaymentPlan, as: "paymentPlan" }],
    });

    return res.status(200).json({
      success: true,
      message: "Evento y plan de pagos configurados y publicados exitosamente",
      data: updatedEvent,
    });
  } catch (error) {
    // Revertir cambios ante cualquier error de la BD
    await t.rollback();
    console.error("Error al publicar evento:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error interno del servidor" });
  }
};

module.exports = {
  getAllEvents,
  getEventBySlug,
  createEvent,
  publishEvent,
};

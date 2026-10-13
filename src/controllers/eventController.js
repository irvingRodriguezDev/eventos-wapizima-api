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
 * Crear Evento completo con Portada, Tipos de Boletos y Plan de Pagos
 */
const createEvent = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { title, description, location, mapa, startDate, endDate, status } =
      req.body;
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
        allowsPaymentPlan: true,
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
      slugEvent: newEvent.slug,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error al crear evento:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error al registrar el evento" });
  }
};
//funcion que nos permite obtener todos los eventos que se encuentran como borrador
const getAllEventsDrafted = async (req, res) => {
  try {
    const eventsdraft = await Event.findAll({
      where: { status: "draft", deletedAt: null },
      include: [
        {
          model: EventImage,
          as: "image",
          attributes: ["s3key"],
        },
      ],
      order: [["startDate", "ASC"]],
    });
    const formattedEventsDraft = eventsdraft.map((event) => {
      const eventData = event.toJSON();
      return {
        ...eventData,
        image: eventData.image ? getS3Url(eventData.image.s3key) : null,
      };
    });
    return res.status(200).json(formattedEventsDraft);
  } catch (error) {
    console.log(
      error,
      "Hubo un error al obtener la lista de los eventos en borrador",
    );
    return res
      .status(500)
      .json({ message: "Hubo un error al listar los eventos" });
  }
};
//funcion que nos permite listar los eventos publicos
const getAllEventsPublished = async (req, res) => {
  try {
    const events = await Event.findAll({
      where: { status: "published", deletedAt: null },
      include: [
        {
          model: EventImage,
          as: "image",
          attributes: ["id", "s3key"],
        },
      ],
      order: [["startDate", "ASC"]],
    });
    const formatedEvents = events.map((event) => {
      const eventData = event.toJSON();
      return {
        ...eventData,
        image: eventData.image ? getS3Url(eventData.image.s3key) : null,
      };
    });
    return res.status(200).json(formatedEvents);
  } catch (error) {
    console.log(
      error,
      "Hubo un error al obtener la lista de los eventos en borrador",
    );
    return res
      .status(500)
      .json({ message: "Hubo un error al listar los eventos" });
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
      include: [{ model: EventImage, as: "image" }],
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

//Funcion para publicar un evento, asegurando que tenga un plan de pagos configurado antes de hacerlo disponible para la venta
const publishEvent = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { milestones, allowsPaymentPlan = true } = req.body;

    // 1. Buscar evento
    const event = await Event.findOne({ where: { id }, transaction: t });

    if (!event) {
      await t.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Evento no encontrado" });
    }

    if (!milestones || milestones.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message:
          "Debe incluir al menos un hito en la estructura del plan de pagos",
      });
    }

    // Opcional: Validar que la suma coincida con el precio base del evento
    const totalPlan = milestones.reduce(
      (sum, item) => sum + (parseFloat(item.amount) || 0),
      0,
    );

    if (
      Number(event.price) > 0 &&
      Math.abs(totalPlan - Number(event.price)) > 0.01
    ) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: `La suma del plan ($${totalPlan}) no coincide con el precio del evento ($${event.price})`,
      });
    }

    // 2. Reemplazar registros en EventPaymentPlan (Tabla de Hitos)
    await EventPaymentPlan.destroy({
      where: { eventId: event.id },
      transaction: t,
    });

    const planRecords = milestones.map((item, index) => ({
      eventId: event.id,
      step: index + 1,
      concept: item.concept,
      amount: parseFloat(item.amount) || 0,
      note: item.note || null,
    }));

    await EventPaymentPlan.bulkCreate(planRecords, { transaction: t });

    // 3. Actualizar Evento a Publicado
    event.allowsPaymentPlan = allowsPaymentPlan;
    event.status = "published";
    await event.save({ transaction: t });

    await t.commit();

    return res.status(200).json({
      success: true,
      message: "Plan de pagos configurado y evento publicado exitosamente",
      data: event,
    });
  } catch (error) {
    await t.rollback();
    console.error("Error al publicar evento:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor al guardar la configuración",
    });
  }
};

const saveSeatingMap = async (req, res) => {
  try {
    const { id } = req.params;
    const { seatingMapConfig } = req.body; // Llega el JSON serializado de Konva

    const event = await Event.findByPk(id);
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Evento no encontrado" });
    }

    event.seatingMapConfig = seatingMapConfig;
    await event.save();

    return res.status(200).json({
      success: true,
      message: "Mapa de asientos guardado correctamente",
      data: event,
    });
  } catch (error) {
    console.error("Error al guardar mapa de asientos:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error interno del servidor" });
  }
};

module.exports = {
  getAllEventsDrafted,
  getAllEventsPublished,
  getEventBySlug,
  createEvent,
  publishEvent,
  saveSeatingMap,
};

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
    const {
      title,
      description,
      location,
      mapa,
      startDate,
      endDate,
      status,
      hasSeatingMap,
      percentageInitialPayment,
      daysBeforePayment,
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
        allowsPaymentPlan: true,
        hasSeatingMap: hasSeatingMap || false,
        status,
        percentageInitialPayment,
        daysBeforePayment,
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
        {
          model: TicketType,
          as: "ticketTypes",
          attributes: ["id", "name", "price", "totalQuantity"],
          order: [["price", "desc"]],
        },
        {
          model: EventPaymentPlan,
          as: "paymentPlan",
          attributes: ["id", "step", "concept", "percentage", "dueDate"],
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
        {
          model: TicketType,
          as: "ticketTypes",
          attributes: ["id", "name", "price", "totalQuantity"],
          order: [["price", "desc"]],
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
      include: [
        { model: EventImage, as: "image", attributes: ["s3key"] },
        {
          model: TicketType,
          as: "ticketTypes",
          attributes: ["id", "name", "price", "totalQuantity", "color"],
        },
      ],
      // NOTA: El 'order' para modelos asociados debe ir a nivel raíz en Sequelize
      order: [[{ model: TicketType, as: "ticketTypes" }, "price", "DESC"]],
    });

    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Evento no encontrado" });
    }

    // Convertimos la instancia de Sequelize a objeto plano JSON
    const eventData = event.toJSON();

    // Reemplazamos/generamos el campo 'image' con la URL completa de S3
    const formattedEvent = {
      ...eventData,
      image: eventData.image ? getS3Url(eventData.image.s3key) : null,
    };

    return res.status(200).json(formattedEvent);
  } catch (error) {
    console.error("Error al obtener detalle del evento:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error interno del servidor" });
  }
};

//Funcion para publicar un evento, asegurando que tenga un plan de pagos configurado antes de hacerlo disponible para la venta
const updateEventSettings = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { hasSeatingMap, seatingMapConfig, paymentPlanMilestones } = req.body;

    // 1. Buscar el evento existente
    const event = await Event.findByPk(id, { transaction });
    if (!event) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "El evento especificado no existe.",
      });
    }

    // Objeto de campos a actualizar en la tabla Events
    const fieldsToUpdate = {};

    if (hasSeatingMap !== undefined) {
      fieldsToUpdate.hasSeatingMap = Boolean(hasSeatingMap);
    }

    // 2. Procesar y actualizar el mapa si se envía en el body
    if (seatingMapConfig !== undefined) {
      fieldsToUpdate.seatingMapConfig = seatingMapConfig;

      // Opcional: Calcular la capacidad total sumando las filas del mapa
      if (seatingMapConfig && Array.isArray(seatingMapConfig.elements)) {
        const calculatedCapacity = seatingMapConfig.elements
          .filter((el) => el.type === "row_block")
          .reduce((sum, el) => sum + (parseInt(el.seatCount, 10) || 0), 0);

        fieldsToUpdate.totalCapacity = calculatedCapacity;
      }
    }

    // Aplicar actualización del evento si hay campos modificados
    if (Object.keys(fieldsToUpdate).length > 0) {
      await event.update(fieldsToUpdate, { transaction });
    }

    // 3. Procesar y reemplazar los hitos del Plan de Pagos
    if (paymentPlanMilestones && Array.isArray(paymentPlanMilestones)) {
      // Limpiar los hitos previos registrados
      await EventPaymentPlan.destroy({
        where: { eventId: id },
        transaction,
      });

      // Formatear los nuevos hitos
      const formattedMilestones = paymentPlanMilestones.map((item, index) => ({
        eventId: parseInt(id, 10),
        step: item.step || index + 1,
        concept: item.concept ? item.concept.trim() : `Hito ${index + 1}`,
        percentage: parseFloat(item.percentage) || 0,
        dueDate: item.dueDate || null,
        note: item.note ? item.note.trim() : null,
      }));

      // Inserción masiva
      if (formattedMilestones.length > 0) {
        await EventPaymentPlan.bulkCreate(formattedMilestones, { transaction });
      }
    }

    // 4. Confirmar la transacción
    await transaction.commit();

    // 5. Consultar los datos unificados para devolver al cliente
    const updatedEvent = await Event.findByPk(id, {
      include: [
        { model: TicketType, as: "ticketTypes" },
        { model: EventPaymentPlan, as: "paymentPlan" },
      ],
    });

    return res.status(200).json({
      success: true,
      message: "Configuración del evento guardada correctamente.",
      data: updatedEvent,
    });
  } catch (error) {
    // Garantizar Rollback en caso de error
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }

    console.error("Error al actualizar la configuración del evento:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno al guardar la configuración del evento.",
      error: error.message,
    });
  }
};

module.exports = {
  getAllEventsDrafted,
  getAllEventsPublished,
  getEventBySlug,
  createEvent,
  updateEventSettings,
};

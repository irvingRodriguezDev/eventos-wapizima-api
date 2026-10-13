const { TicketType, Event, Ticket, sequelize } = require("../models");

/**
 * Obtener todos los tipos de boletos / zonas de un evento específico
 * GET /api/events/:eventId/ticket-types
 */
const getTicketTypesByEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "El evento especificado no existe.",
      });
    }

    const ticketTypes = await TicketType.findAll({
      where: { eventId },
      order: [["price", "DESC"]], // De mayor a menor precio
    });

    return res.status(200).json(ticketTypes);
  } catch (error) {
    console.error("Error al obtener zonas del evento:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno al consultar las zonas del evento.",
      error: error.message,
    });
  }
};

/**
 * Crear una nueva zona / tipo de boleto para un evento
 * POST /api/events/:eventId/ticket-types
 */
const createTicketType = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { ticketTypes } = req.body;

    // Validación de que exista el arreglo
    if (
      !ticketTypes ||
      !Array.isArray(ticketTypes) ||
      ticketTypes.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Se requiere un arreglo de tipos de boletos válido.",
      });
    }

    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "El evento especificado no existe.",
      });
    }

    // Mapeamos el arreglo para asegurar los tipos de datos correctos para Sequelize
    const formattedTicketTypes = ticketTypes.map((item) => ({
      eventId: parseInt(eventId, 10),
      name: item.nombre.trim(),
      price: parseFloat(item.precio),
      totalQuantity: parseInt(item.capacidad, 10),
      availableQuantity: parseInt(item.capacidad, 10), // Inicialmente disponible = capacidad total
      color: item.color || "#E53888",
      description: item.descripcion ? item.descripcion.trim() : null,
    }));

    // Inserción masiva eficiente en la base de datos
    const createdTicketTypes =
      await TicketType.bulkCreate(formattedTicketTypes);

    return res.status(201).json({
      success: true,
      message: "Zonas y tipos de boletos creados exitosamente.",
      data: createdTicketTypes,
    });
  } catch (error) {
    console.error("Error al crear zonas en lote:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno al crear los tipos de boleto.",
      error: error.message,
    });
  }
};

/**
 * Actualizar una zona / tipo de boleto existente
 * PUT /api/ticket-types/:id
 */
const updateTicketType = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      price,
      totalQuantity,
      availableQuantity,
      color,
      description,
    } = req.body;

    const ticketType = await TicketType.findByPk(id);
    if (!ticketType) {
      return res.status(404).json({
        success: false,
        message: "La zona / tipo de boleto no existe.",
      });
    }

    // Actualizamos únicamente los campos que han sido proporcionados
    await ticketType.update({
      name: name !== undefined ? name.trim() : ticketType.name,
      price: price !== undefined ? parseFloat(price) : ticketType.price,
      totalQuantity:
        totalQuantity !== undefined
          ? Number(totalQuantity)
          : ticketType.totalQuantity,
      availableQuantity:
        availableQuantity !== undefined
          ? Number(availableQuantity)
          : ticketType.availableQuantity,
      color: color !== undefined ? color : ticketType.color,
      description:
        description !== undefined ? description.trim() : ticketType.description,
    });

    return res.status(200).json({
      success: true,
      message: "Zona actualizada correctamente.",
      data: ticketType,
    });
  } catch (error) {
    console.error("Error al actualizar zona:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno al actualizar el tipo de boleto.",
      error: error.message,
    });
  }
};

/**
 * Eliminar una zona / tipo de boleto
 * DELETE /api/ticket-types/:id
 */
const deleteTicketType = async (req, res) => {
  try {
    const { id } = req.params;

    const ticketType = await TicketType.findByPk(id);
    if (!ticketType) {
      return res.status(404).json({
        success: false,
        message: "La zona especificada no existe.",
      });
    }

    // Seguridad: Verificar si ya existen boletos creados u órdenes activas en esta zona
    const associatedTicketsCount = await Ticket.count({
      where: { ticketTypeId: id },
    });

    if (associatedTicketsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar la zona '${ticketType.name}' porque ya existen ${associatedTicketsCount} boleto(s) o reservaciones asociadas a ella.`,
      });
    }

    await ticketType.destroy();

    return res.status(200).json({
      success: true,
      message: "Zona eliminada correctamente.",
    });
  } catch (error) {
    console.error("Error al eliminar zona:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno al eliminar la zona.",
      error: error.message,
    });
  }
};

module.exports = {
  getTicketTypesByEvent,
  createTicketType,
  updateTicketType,
  deleteTicketType,
};

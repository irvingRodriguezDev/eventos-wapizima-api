const { Coupon, Event, Order } = require("../models");
const { Op } = require("sequelize");

// ==========================================
// 1. PÚBLICO: Validar Cupón en el Checkout
// ==========================================
exports.validateCoupon = async (req, res) => {
  try {
    const { code, eventId, totalAmount, paymentType } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Por favor ingresa un código de cupón.",
      });
    }

    const cleanCode = code.trim().toUpperCase();

    // 1. Buscar el cupón activo
    const coupon = await Coupon.findOne({
      where: {
        code: cleanCode,
        isActive: true,
      },
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "El cupón ingresado no existe o no está disponible.",
      });
    }

    // 2. Regla Estratégica: Solo válido para Compras de Contado
    if (coupon.applicablePaymentType === "FULL" && paymentType !== "FULL") {
      return res.status(400).json({
        success: false,
        message: "Este cupón promocional es exclusivo para compras de contado.",
      });
    }

    // 3. Validar Vigencia de Fechas
    const now = new Date();
    if (coupon.validFrom && now < new Date(coupon.validFrom)) {
      return res.status(400).json({
        success: false,
        message: "Este cupón aún no se encuentra activo.",
      });
    }

    if (coupon.validUntil && now > new Date(coupon.validUntil)) {
      return res.status(400).json({
        success: false,
        message: "El cupón ha expirado.",
      });
    }

    // 4. Validar Límite de Usos (Psicología de Escasez)
    if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
      return res.status(400).json({
        success: false,
        message:
          "Este cupón ha alcanzado el límite máximo de canjes disponibles.",
      });
    }

    // 5. Validar si es específico para un evento
    if (coupon.eventId && Number(coupon.eventId) !== Number(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Este cupón no es válido para este evento.",
      });
    }

    // 6. Validar Monto Mínimo de Compra
    const purchaseTotal = parseFloat(totalAmount || 0);
    const minPurchase = parseFloat(coupon.minPurchaseAmount || 0);

    if (purchaseTotal < minPurchase) {
      return res.status(400).json({
        success: false,
        message: `El monto mínimo de compra para este cupón es de $${minPurchase} MXN.`,
      });
    }

    // 7. Calcular el Descuento
    let discountAmount = 0;
    const discountValue = parseFloat(coupon.discountValue);

    if (coupon.discountType === "FIXED") {
      discountAmount = Math.min(purchaseTotal, discountValue);
    } else if (coupon.discountType === "PERCENTAGE") {
      discountAmount = (purchaseTotal * discountValue) / 100;
    }

    const finalTotal = Math.max(0, purchaseTotal - discountAmount);

    return res.status(200).json({
      success: true,
      message: "¡Cupón aplicado correctamente!",
      data: {
        couponId: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: parseFloat(discountAmount.toFixed(2)),
        finalTotal: parseFloat(finalTotal.toFixed(2)),
      },
    });
  } catch (error) {
    console.error("Error al validar el cupón:", error);
    return res.status(500).json({
      success: false,
      message: "Ocurrió un error al procesar el cupón.",
    });
  }
};

// ==========================================
// 2. ADMIN: Crear Cupón
// ==========================================
exports.createCoupon = async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      minPurchaseAmount,
      maxUses,
      validFrom,
      validUntil,
      applicablePaymentType,
      eventId,
    } = req.body;

    const cleanCode = code ? code.trim().toUpperCase() : null;

    // Verificar si ya existe un cupón con el mismo código
    const existingCoupon = await Coupon.findOne({ where: { code: cleanCode } });
    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: `Ya existe un cupón registrado con el código '${cleanCode}'.`,
      });
    }

    const newCoupon = await Coupon.create({
      code: cleanCode,
      discountType,
      discountValue,
      minPurchaseAmount: minPurchaseAmount || 0,
      maxUses: maxUses || 100,
      currentUses: 0,
      validFrom: validFrom || null,
      validUntil: validUntil || null,
      applicablePaymentType: applicablePaymentType || "FULL",
      eventId: eventId || null,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Cupón creado exitosamente.",
      data: newCoupon,
    });
  } catch (error) {
    console.error("Error al crear el cupón:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno al crear el cupón.",
    });
  }
};

// ==========================================
// 3. ADMIN: Obtener Lista de Cupones
// ==========================================
exports.getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.findAll({
      include: [
        {
          model: Event,
          as: "event",
          attributes: ["id", "title"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: coupons,
    });
  } catch (error) {
    console.error("Error al obtener cupones:", error);
    return res.status(500).json({
      success: false,
      message: "Error al listar los cupones.",
    });
  }
};

// ==========================================
// 4. ADMIN: Actualizar Cupón
// ==========================================
exports.updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findByPk(id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "El cupón no existe.",
      });
    }

    await coupon.update(req.body);

    return res.status(200).json({
      success: true,
      message: "Cupón actualizado correctamente.",
      data: coupon,
    });
  } catch (error) {
    console.error("Error al actualizar el cupón:", error);
    return res.status(500).json({
      success: false,
      message: "Error al actualizar el cupón.",
    });
  }
};

// ==========================================
// 5. ADMIN: Cambiar Estado Activo/Inactivo
// ==========================================
exports.toggleCouponStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findByPk(id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "El cupón no existe.",
      });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    return res.status(200).json({
      success: true,
      message: `El cupón ahora está ${coupon.isActive ? "Activo" : "Inactivo"}.`,
      data: coupon,
    });
  } catch (error) {
    console.error("Error al cambiar estado del cupón:", error);
    return res.status(500).json({
      success: false,
      message: "Error al modificar el estado.",
    });
  }
};

exports.deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findByPk(id);
    await coupon.destroy();
    return res
      .status(200)
      .json({ message: "El cupón se desactivo correctamente!" });
  } catch (error) {
    console.log(error, "el error al eliminar el cupom");

    return res
      .status(400)
      .json({ message: "No se pudo eliminar el cupón", error });
  }
};

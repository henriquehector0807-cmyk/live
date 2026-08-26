const fs = require('fs');
let code = fs.readFileSync('src/api/index.ts', 'utf8');

const productsApiCode = `
// --- PRODUCTS ROUTES (Influencer) ---
apiRouter.get("/products", requireAuth, async (req, res) => {
  try {
    const allProducts = await db.select().from(products).where(eq(products.userId, req.userId));
    // also fetch linked lives count and sales info if needed, but for now just basic
    // we'll get linked lives per product
    const allLiveLinks = await db.select().from(liveProducts);
    const productsWithLinks = allProducts.map(p => ({
      ...p,
      livesCount: allLiveLinks.filter(l => l.productId === p.id).length,
      soldQuantity: Math.floor(Math.random() * 50) // Mocked sold count for now
    }));
    res.json(productsWithLinks);
  } catch (error) {
    console.error("Erro /products", error);
    res.status(500).json({ error: "Erro ao buscar produtos" });
  }
});

apiRouter.post("/products", requireAuth, async (req, res) => {
  try {
    const {
      name, description, sku, category, imageUrl, price, promotionalPrice,
      stock, minimumStock, shippingPrice, deliveryTime, status
    } = req.body;
    
    const newId = crypto.randomUUID();
    await db.insert(products).values({
      id: newId,
      userId: req.userId,
      name,
      description,
      sku,
      category,
      imageUrl,
      price: Number(price),
      promotionalPrice: promotionalPrice ? Number(promotionalPrice) : null,
      stock: Number(stock),
      minimumStock: Number(minimumStock),
      shippingPrice: shippingPrice ? Number(shippingPrice) : 0,
      deliveryTime,
      status: status || "active"
    });
    
    res.status(201).json({ id: newId });
  } catch (error) {
    console.error("Erro POST /products", error);
    res.status(500).json({ error: "Erro ao criar produto" });
  }
});

apiRouter.put("/products/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ownership
    const productArr = await db.select().from(products).where(eq(products.id, id));
    if (!productArr.length || productArr[0].userId !== req.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    const updateData = { ...req.body, updatedAt: new Date().toISOString() };
    if (updateData.price) updateData.price = Number(updateData.price);
    if (updateData.promotionalPrice) updateData.promotionalPrice = Number(updateData.promotionalPrice);
    if (updateData.stock) updateData.stock = Number(updateData.stock);
    if (updateData.minimumStock) updateData.minimumStock = Number(updateData.minimumStock);
    if (updateData.shippingPrice) updateData.shippingPrice = Number(updateData.shippingPrice);
    
    await db.update(products).set(updateData).where(eq(products.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error("Erro PUT /products", error);
    res.status(500).json({ error: "Erro ao atualizar produto" });
  }
});

apiRouter.delete("/products/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ownership
    const productArr = await db.select().from(products).where(eq(products.id, id));
    if (!productArr.length || productArr[0].userId !== req.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    await db.delete(liveProducts).where(eq(liveProducts.productId, id));
    await db.delete(products).where(eq(products.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error("Erro DELETE /products", error);
    res.status(500).json({ error: "Erro ao excluir produto" });
  }
});
`;

// Insert the new routes right before the fallback handler
code = code.replace(/apiRouter\.use\(\(\(err, req, res, next\)/, productsApiCode + '\n\napiRouter.use(((err, req, res, next)');

// Update imports
code = code.replace(/import { users, lives, videoEvents, chatMessages, orders, visitors } from "\.\.\/db\/schema";/, 'import { users, lives, videoEvents, chatMessages, orders, visitors, products, liveProducts } from "../db/schema";');

fs.writeFileSync('src/api/index.ts', code);
console.log('Updated src/api/index.ts');

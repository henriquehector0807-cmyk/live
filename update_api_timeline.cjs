const fs = require('fs');
let code = fs.readFileSync('src/api/index.ts', 'utf8');

const timelineApiCode = `
// --- LIVE TIMELINE ROUTES ---
apiRouter.get("/lives/:liveId/products", async (req, res) => {
  try {
    const { liveId } = req.params;
    const timeline = await db.select({
      id: liveProductTimeline.id,
      liveId: liveProductTimeline.liveId,
      productId: liveProductTimeline.productId,
      startTime: liveProductTimeline.startTime,
      endTime: liveProductTimeline.endTime,
      showOnVideo: liveProductTimeline.showOnVideo,
      product: products
    })
    .from(liveProductTimeline)
    .innerJoin(products, eq(liveProductTimeline.productId, products.id))
    .where(eq(liveProductTimeline.liveId, liveId))
    .orderBy(liveProductTimeline.startTime);
    
    res.json(timeline);
  } catch (error) {
    console.error("Erro GET /lives/:liveId/products", error);
    res.status(500).json({ error: "Erro ao buscar timeline" });
  }
});

apiRouter.post("/lives/:liveId/products", requireAuth, async (req, res) => {
  try {
    const { liveId } = req.params;
    const { productId, startTime, endTime, showOnVideo } = req.body;
    
    // Check for overlap (simple logic, could be more robust)
    const existing = await db.select().from(liveProductTimeline).where(eq(liveProductTimeline.liveId, liveId));
    const overlap = existing.some(item => 
      (startTime >= item.startTime && startTime < item.endTime) ||
      (endTime > item.startTime && endTime <= item.endTime) ||
      (startTime <= item.startTime && endTime >= item.endTime)
    );
    
    if (overlap) {
      return res.status(400).json({ error: "Conflito de horário com outro produto." });
    }
    
    const newId = crypto.randomUUID();
    await db.insert(liveProductTimeline).values({
      id: newId,
      liveId,
      productId,
      startTime: Number(startTime),
      endTime: Number(endTime),
      showOnVideo: showOnVideo ? 1 : 0
    });
    
    res.status(201).json({ id: newId });
  } catch (error) {
    console.error("Erro POST /lives/:liveId/products", error);
    res.status(500).json({ error: "Erro ao adicionar produto à timeline" });
  }
});

apiRouter.delete("/lives/:liveId/products/:timelineId", requireAuth, async (req, res) => {
  try {
    const { timelineId } = req.params;
    await db.delete(liveProductTimeline).where(eq(liveProductTimeline.id, timelineId));
    res.json({ success: true });
  } catch (error) {
    console.error("Erro DELETE timeline item", error);
    res.status(500).json({ error: "Erro ao remover produto da timeline" });
  }
});

// Update the public endpoint to include timeline
apiRouter.get("/public/live/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const liveArr = await db.select().from(lives).where(eq(lives.slug, slug));
    if (!liveArr.length) {
      return res.status(404).json({ error: "Live não encontrada" });
    }
    
    const liveData = liveArr[0];
    
    const events = await db.select().from(videoEvents).where(eq(videoEvents.liveId, liveData.id));
    
    const timeline = await db.select({
      id: liveProductTimeline.id,
      productId: liveProductTimeline.productId,
      startTime: liveProductTimeline.startTime,
      endTime: liveProductTimeline.endTime,
      showOnVideo: liveProductTimeline.showOnVideo,
      product: products
    })
    .from(liveProductTimeline)
    .innerJoin(products, eq(liveProductTimeline.productId, products.id))
    .where(eq(liveProductTimeline.liveId, liveData.id))
    .orderBy(liveProductTimeline.startTime);

    res.json({
      live: liveData,
      events,
      timeline
    });
  } catch (error) {
    console.error("Erro ao buscar live", error);
    res.status(500).json({ error: "Erro interno" });
  }
});
`;

// Also need to fetch live by ID
const getLiveByIdCode = `
apiRouter.get("/lives/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const liveArr = await db.select().from(lives).where(eq(lives.id, id));
    if (!liveArr.length) {
      return res.status(404).json({ error: "Live not found" });
    }
    if (liveArr[0].userId !== req.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    res.json(liveArr[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error" });
  }
});
`;

// Update imports
code = code.replace(/import { users, lives, videoEvents, chatMessages, orders, visitors, products, liveProducts } from "\.\.\/db\/schema";/, 'import { users, lives, videoEvents, chatMessages, orders, visitors, products, liveProducts, liveProductTimeline } from "../db/schema";');

// Replace the old public endpoint
const oldPublicEndpointRegex = /apiRouter\.get\("\/public\/live\/:slug", async \(req, res\) => {[\s\S]*?}\);/;
code = code.replace(oldPublicEndpointRegex, '');

// Insert new routes
code = code.replace(/apiRouter\.use\(\(\(err, req, res, next\)/, getLiveByIdCode + '\n' + timelineApiCode + '\n\napiRouter.use(((err, req, res, next)');

fs.writeFileSync('src/api/index.ts', code);
console.log('Updated src/api/index.ts for timeline');

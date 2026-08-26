const fs = require('fs');
let code = fs.readFileSync('src/api/index.ts', 'utf8');

const putLiveCode = `
apiRouter.put("/lives/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, productName, productPrice, videoUrl, status } = req.body;
    
    // Validate ownership
    const liveArr = await db.select().from(lives).where(eq(lives.id, id));
    if (!liveArr.length || liveArr[0].userId !== req.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    await db.update(lives).set({
      title,
      description,
      productName,
      productPrice: Number(productPrice),
      videoUrl,
      status
    }).where(eq(lives.id, id));
    
    res.json({ success: true, id });
  } catch (error) {
    console.error("Erro PUT /lives/:id", error);
    res.status(500).json({ error: "Erro ao atualizar live" });
  }
});
`;

if (!code.includes('apiRouter.put("/lives/:id"')) {
  code = code.replace(/apiRouter\.use\(\(\(err, req, res, next\)/, putLiveCode + '\napiRouter.use(((err, req, res, next)');
  fs.writeFileSync('src/api/index.ts', code);
  console.log('Added PUT /api/lives/:id');
} else {
  console.log('PUT already exists');
}

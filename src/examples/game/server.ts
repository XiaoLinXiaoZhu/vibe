import express from "express";
import path from "path";
import { GameEngine } from "./game-engine.js";

const app = express();
app.use(express.json());

// 静态文件
const publicDir = path.join(import.meta.dirname, "public");
app.use(express.static(publicDir));

// 游戏实例（单玩家，内存中）
let engine = new GameEngine();

// --- API 路由 ---
app.get("/api/state", (_req, res) => {
  res.json(engine.getState());
});

app.post("/api/recruit", async (req, res) => {
  try {
    const { theme = "奇幻", role = "战士" } = req.body;
    const state = await engine.recruitGeneral(theme, role);
    res.json(state);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.post("/api/start", async (_req, res) => {
  try { res.json(await engine.finishRecruit()); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.post("/api/select", (req, res) => {
  try { res.json(engine.selectUnit(req.body.unitId)); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.post("/api/deselect", (_req, res) => {
  res.json(engine.deselectUnit());
});

app.post("/api/move", (req, res) => {
  try {
    const { unitId, x, y } = req.body;
    res.json(engine.moveUnit(unitId, x, y));
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.post("/api/attack", async (req, res) => {
  try {
    const { attackerId, targetId } = req.body;
    res.json(await engine.attack(attackerId, targetId));
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.post("/api/skill", async (req, res) => {
  try {
    const { unitId, skillIndex, targetId } = req.body;
    res.json(await engine.useSkill(unitId, skillIndex, targetId));
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.post("/api/end-turn", async (_req, res) => {
  try { res.json(await engine.endPlayerTurn()); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.post("/api/reset", (_req, res) => {
  engine = new GameEngine();
  res.json(engine.getState());
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`🎮 将领战棋服务器启动: http://localhost:${PORT}`);
});

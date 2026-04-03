import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { createAgent, listAgents, deleteAgent } from "./agentStore.js";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

// ── Swagger / OpenAPI setup ───────────────────────────────────────────────────
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "MarkDone Agent API",
      version: "1.0.0",
      description: "REST API for managing MarkDone agents.",
    },
    servers: [{ url: `http://localhost:${PORT}` }],
    components: {
      schemas: {
        Agent: {
          type: "object",
          properties: {
            id:           { type: "string", example: "f32675e0" },
            name:         { type: "string", example: "Legal Advisor" },
            description:  { type: "string", example: "Reviews contracts and flags legal risks" },
            systemPrompt: { type: "string", example: "You are an expert legal advisor..." },
            createdAt:    { type: "string", format: "date-time" },
            updatedAt:    { type: "string", format: "date-time" },
          },
        },
        CreateAgentBody: {
          type: "object",
          required: ["name", "systemPrompt"],
          properties: {
            name:         { type: "string", example: "Legal Advisor" },
            description:  { type: "string", example: "Reviews contracts and flags legal risks" },
            systemPrompt: { type: "string", example: "You are an expert legal advisor specialising in contract law." },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string", example: "name is required" },
          },
        },
      },
    },
  },
  apis: ["./src/server.ts"],
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/docs.json", (_req, res) => res.json(swaggerSpec));

// ── POST /agents — Create a new agent ────────────────────────────────────────
/**
 * @openapi
 * /agents:
 *   post:
 *     summary: Create a new agent
 *     tags: [Agents]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAgentBody'
 *     responses:
 *       201:
 *         description: Agent created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Agent'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post("/agents", (req: Request, res: Response) => {
  const { name, description = "", systemPrompt } = req.body as {
    name?: string;
    description?: string;
    systemPrompt?: string;
  };

  if (!name?.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  if (!systemPrompt?.trim()) {
    res.status(400).json({ error: "systemPrompt is required" });
    return;
  }

  const agent = createAgent({
    name: name.trim(),
    description: description.trim(),
    systemPrompt: systemPrompt.trim(),
  });

  res.status(201).json(agent);
});

// ── GET /agents — List all agents ────────────────────────────────────────────
/**
 * @openapi
 * /agents:
 *   get:
 *     summary: List all agents
 *     tags: [Agents]
 *     responses:
 *       200:
 *         description: Array of all agents
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Agent'
 */
app.get("/agents", (_req: Request, res: Response) => {
  res.json(listAgents());
});

// ── DELETE /agents/:id — Delete an agent ─────────────────────────────────────
/**
 * @openapi
 * /agents/{id}:
 *   delete:
 *     summary: Delete an agent
 *     tags: [Agents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The agent ID
 *     responses:
 *       204:
 *         description: Agent deleted successfully
 *       404:
 *         description: Agent not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.delete("/agents/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = deleteAgent(id);

  if (!deleted) {
    res.status(404).json({ error: `Agent '${id}' not found` });
    return;
  }

  res.status(204).send();
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`MarkDone API running on http://localhost:${PORT}`);
  console.log(`  POST   /agents      Create an agent`);
  console.log(`  GET    /agents      List all agents`);
  console.log(`  DELETE /agents/:id  Delete an agent`);
  console.log(`  GET    /docs        Swagger UI`);
  console.log(`  GET    /docs.json   OpenAPI spec`);
});

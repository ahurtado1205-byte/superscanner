import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

router.post("/scan", async (req, res) => {
  const { imageBase64 } = req.body;

  if (!imageBase64 || typeof imageBase64 !== "string") {
    res.status(400).json({ error: "imageBase64 is required" });
    return;
  }

  const dataUrl = imageBase64.startsWith("data:")
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 1024,
    messages: [
      {
        role: "system",
        content: `You are a product label scanner. Extract product information from supermarket product labels.
Always respond with valid JSON only, no markdown, no extra text. Use this exact format:
{
  "name": "product name",
  "brand": "brand name or null",
  "price": 1.99 or null,
  "quantity": "500g or 1L or null",
  "notes": "any other relevant info or null"
}
If you cannot identify the product, return { "name": "Producto desconocido", "brand": null, "price": null, "quantity": null, "notes": null }.`,
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: dataUrl },
          },
          {
            type: "text",
            text: "Extract the product information from this supermarket label. Return only JSON.",
          },
        ],
      },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "{}";

  let parsed: {
    name: string;
    brand?: string | null;
    price?: number | null;
    quantity?: string | null;
    notes?: string | null;
  };

  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = {
      name: "Producto escaneado",
      brand: null,
      price: null,
      quantity: null,
      notes: content.slice(0, 200),
    };
  }

  res.json({
    name: parsed.name || "Producto escaneado",
    brand: parsed.brand ?? null,
    price: typeof parsed.price === "number" ? parsed.price : null,
    quantity: parsed.quantity ?? null,
    notes: parsed.notes ?? null,
  });
});

export default router;

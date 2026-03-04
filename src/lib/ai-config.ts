import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAzure } from "@ai-sdk/azure";

// ─── Provider types ───────────────────────────────────────────────
type ChatProvider = "openai" | "anthropic" | "google" | "azure" | "openai-compatible";
type EmbeddingProvider = "openai" | "google" | "azure" | "openai-compatible";

// ─── API key resolution ───────────────────────────────────────────
function resolveAPIKey(...candidates: (string | undefined)[]): string {
  for (const key of candidates) {
    if (key && key.trim().length > 0) return key;
  }
  throw new Error(
    "No API key found. Set AI_API_KEY, OPENAI_API_KEY, or a provider-specific key."
  );
}

// ─── Chat model factory ──────────────────────────────────────────
function createChatModel() {
  const provider = (process.env.AI_PROVIDER || "openai") as ChatProvider;
  const model = process.env.AI_MODEL || "gpt-4o-mini";
  const baseURL = process.env.AI_BASE_URL || undefined;

  switch (provider) {
    case "openai": {
      const apiKey = resolveAPIKey(process.env.AI_API_KEY, process.env.OPENAI_API_KEY);
      return createOpenAI({ apiKey })(model);
    }
    case "anthropic": {
      const apiKey = resolveAPIKey(process.env.AI_API_KEY, process.env.ANTHROPIC_API_KEY);
      return createAnthropic({ apiKey })(model);
    }
    case "google": {
      const apiKey = resolveAPIKey(process.env.AI_API_KEY, process.env.GOOGLE_GENERATIVE_AI_API_KEY);
      return createGoogleGenerativeAI({ apiKey })(model);
    }
    case "azure": {
      const apiKey = resolveAPIKey(process.env.AI_API_KEY, process.env.AZURE_API_KEY);
      const resourceName = process.env.AZURE_RESOURCE_NAME;
      if (!resourceName) {
        throw new Error("AZURE_RESOURCE_NAME is required when AI_PROVIDER=azure");
      }
      return createAzure({ apiKey, resourceName })(model);
    }
    case "openai-compatible": {
      if (!baseURL) {
        throw new Error("AI_BASE_URL is required when AI_PROVIDER=openai-compatible");
      }
      const apiKey = resolveAPIKey(process.env.AI_API_KEY, process.env.OPENAI_API_KEY);
      return createOpenAI({ apiKey, baseURL })(model);
    }
    default:
      throw new Error(`Unsupported chat provider: ${provider}`);
  }
}

// ─── Embedding model factory ─────────────────────────────────────
function createEmbeddingModelInstance() {
  const provider = (process.env.AI_EMBEDDING_PROVIDER || "openai") as EmbeddingProvider;
  const model = process.env.AI_EMBEDDING_MODEL || "text-embedding-3-small";
  const baseURL = process.env.AI_EMBEDDING_BASE_URL || undefined;
  switch (provider) {
    case "openai": {
      const apiKey = resolveAPIKey(
        process.env.AI_EMBEDDING_API_KEY, process.env.AI_API_KEY, process.env.OPENAI_API_KEY
      );
      return createOpenAI({ apiKey }).embedding(model);
    }
    case "google": {
      const apiKey = resolveAPIKey(
        process.env.AI_EMBEDDING_API_KEY, process.env.AI_API_KEY, process.env.GOOGLE_GENERATIVE_AI_API_KEY
      );
      return createGoogleGenerativeAI({ apiKey }).textEmbeddingModel(model);
    }
    case "azure": {
      const apiKey = resolveAPIKey(
        process.env.AI_EMBEDDING_API_KEY, process.env.AI_API_KEY, process.env.AZURE_API_KEY
      );
      const resourceName = process.env.AZURE_RESOURCE_NAME;
      if (!resourceName) {
        throw new Error("AZURE_RESOURCE_NAME is required when AI_EMBEDDING_PROVIDER=azure");
      }
      return createAzure({ apiKey, resourceName }).embedding(model);
    }
    case "openai-compatible": {
      if (!baseURL) {
        throw new Error("AI_EMBEDDING_BASE_URL is required when AI_EMBEDDING_PROVIDER=openai-compatible");
      }
      const apiKey = resolveAPIKey(
        process.env.AI_EMBEDDING_API_KEY, process.env.AI_API_KEY, process.env.OPENAI_API_KEY
      );
      return createOpenAI({ apiKey, baseURL }).embedding(model);
    }
    default:
      throw new Error(`Unsupported embedding provider: ${provider}`);
  }
}

// ─── Exports ─────────────────────────────────────────────────────

/** Ready-to-use chat/text-generation model */
export const chatModel = createChatModel();

/** Ready-to-use embedding model */
export const embeddingModel = createEmbeddingModelInstance();

/** Embedding dimensions (must match your model and database column) */
export const embeddingDimensions = parseInt(process.env.AI_EMBEDDING_DIMENSIONS || "1536", 10);

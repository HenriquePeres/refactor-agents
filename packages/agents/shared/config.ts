//import "dotenv/config";

if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = "redis://localhost:6379";
}
if (!process.env.LLM_API_URL) {
  process.env.LLM_API_URL = "https://api.openai.com/v1/chat/completions";
}
if (!process.env.LLM_MODEL) {
  process.env.LLM_MODEL = "gpt-5.1";
}

console.log("CONFIG LOADED. CWD =", process.cwd());
console.log(
  "ENV LLM_* VARS =",
  Object.fromEntries(
    Object.entries(process.env).filter(([k]) => k.startsWith("LLM_"))
  )
);

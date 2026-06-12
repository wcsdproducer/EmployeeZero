import { executeTool } from "./src/lib/executeTool";

async function main() {
  const userId = "iDlOWBqU4ocwHB3D7fTJG3FBAxY2"; // john@t3kniq.com
  console.log("Testing search_conversations tool execution...");
  
  const result = await executeTool(userId, "search_conversations", { query: "LinkedIn post" });
  console.log("Result:", JSON.stringify(result, null, 2));
}

main().catch(console.error);

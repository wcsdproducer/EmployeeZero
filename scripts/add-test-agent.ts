import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

if (!getApps().length) {
  initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "employee-zero-production",
  });
}

const db = getFirestore();
const auth = getAuth();

async function run() {
  console.log("Looking up user: john@t3kniq.com");
  let userId: string | null = null;
  try {
    const userRecord = await auth.getUserByEmail("john@t3kniq.com");
    userId = userRecord.uid;
    console.log(`Found in Firebase Auth. UID: ${userId}`);
  } catch (err: any) {
    console.log(`Not found in Auth via getUserByEmail: ${err.message}. Searching users collection...`);
    const usersSnap = await db.collection("users").get();
    for (const doc of usersSnap.docs) {
      const data = doc.data();
      if (data.email === "john@t3kniq.com" || doc.id === "john@t3kniq.com") {
        userId = doc.id;
        break;
      }
    }
  }

  if (!userId) {
    // Let's check first user if no matching email
    const usersSnap = await db.collection("users").limit(1).get();
    if (!usersSnap.empty) {
      userId = usersSnap.docs[0].id;
      console.log(`Fallback: using the first user found in database. UID: ${userId}`);
    } else {
      console.error("No users found in database at all.");
      process.exit(1);
    }
  }

  const agentRef = db.doc(`users/${userId}/agents/sam`);
  const agentSnap = await agentRef.get();

  const samAgentData = {
    id: "sam",
    name: "Sam",
    avatar: "robot",
    status: "active",
    plan: "pro",
    soul: {
      agentName: "Sam",
      jobTitle: "Lead Researcher",
      tone: "friendly",
      personality: "You are Sam, a highly details-focused AI research agent. You excel at compiling information, browsing documents, and performing exhaustive analysis. You are warm, friendly, and precise.",
      focusAreas: ["Research", "Data Analysis", "Operations"],
      communicationStyle: "Detailed, thorough, with bulleted summaries",
      enabledTools: ["browse_url", "search_web", "read_url_content", "create_note", "read_note", "list_notes"],
      updatedAt: new Date().toISOString()
    }
  };

  if (!agentSnap.exists) {
    console.log("Creating agent Sam...");
    await agentRef.set(samAgentData);
    console.log("Agent Sam created successfully!");
  } else {
    console.log("Agent Sam already exists. Updating configuration to ensure correct tools/personality...");
    await agentRef.set(samAgentData, { merge: true });
    console.log("Agent Sam updated successfully!");
  }

  // Create or update custom agent document for Atlas
  const atlasRef = db.doc(`users/${userId}/agents/atlas`);
  console.log("Setting custom agent Atlas data...");
  await atlasRef.set({
    id: "atlas",
    name: "Atlas",
    avatar: "brain",
    status: "active",
    plan: "pro",
    soul: {
      agentName: "Atlas",
      jobTitle: "Executive Assistant",
      tone: "professional",
      personality: "You are Atlas, a highly capable AI executive assistant. You work autonomously, get things done without being asked twice, and treat every task with the urgency and precision of a seasoned professional.",
      focusAreas: ["Operations", "Sales", "Marketing"],
      communicationStyle: "Brief and bullet-pointed",
      enabledTools: [], // default to empty (allows all connected tools)
      updatedAt: new Date().toISOString()
    }
  }, { merge: true });
  console.log("Agent Atlas updated!");

  console.log("Done.");
}

run().catch(console.error);

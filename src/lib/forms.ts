import { google, forms_v1 } from "googleapis";
import { adminDb } from "@/lib/admin";

/* ─── Auth helper ─── */

async function getAuthenticatedForms(userId: string): Promise<forms_v1.Forms> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("Google OAuth not configured on server");

  const snap = await adminDb.doc(`users/${userId}/settings/connections`).get();
  if (!snap.exists) throw new Error("No connections found — connect Google Forms first");
  const data = snap.data() as Record<string, any>;
  const forms = data?.forms;
  if (!forms?.connected || !forms?.refreshToken) {
    throw new Error("Google Forms is not connected. Go to Connections to set it up.");
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({
    access_token: forms.accessToken,
    refresh_token: forms.refreshToken,
    expiry_date: forms.expiryDate,
  });

  oauth2Client.on("tokens", async (tokens) => {
    try {
      const updates: Record<string, any> = {};
      if (tokens.access_token) updates["forms.accessToken"] = tokens.access_token;
      if (tokens.expiry_date) updates["forms.expiryDate"] = tokens.expiry_date;
      if (tokens.refresh_token) updates["forms.refreshToken"] = tokens.refresh_token;
      await adminDb.doc(`users/${userId}/settings/connections`).update(updates);
    } catch (err) {
      console.error("[Forms] Failed to persist refreshed tokens:", err);
    }
  });

  return google.forms({ version: "v1", auth: oauth2Client });
}

/* ─── Operations ─── */

export async function createForm(userId: string, title: string) {
  const forms = await getAuthenticatedForms(userId);
  const res = await forms.forms.create({
    requestBody: { info: { title } },
  });
  return {
    formId: res.data.formId,
    title: res.data.info?.title,
    url: res.data.responderUri,
    editUrl: `https://docs.google.com/forms/d/${res.data.formId}/edit`,
  };
}

export async function addQuestion(
  userId: string,
  formId: string,
  title: string,
  questionType: "SHORT_ANSWER" | "PARAGRAPH" | "MULTIPLE_CHOICE" | "CHECKBOX" | "DROPDOWN" | "SCALE",
  options?: string[]
) {
  const forms = await getAuthenticatedForms(userId);

  // Build question based on type — only include the relevant field
  let question: Record<string, any> = { required: false };

  switch (questionType) {
    case "SHORT_ANSWER":
      question.textQuestion = { paragraph: false };
      break;
    case "PARAGRAPH":
      question.textQuestion = { paragraph: true };
      break;
    case "MULTIPLE_CHOICE":
      question.choiceQuestion = {
        type: "RADIO",
        options: (options || ["Option 1", "Option 2"]).map((o) => ({ value: o })),
      };
      break;
    case "CHECKBOX":
      question.choiceQuestion = {
        type: "CHECKBOX",
        options: (options || ["Option 1", "Option 2"]).map((o) => ({ value: o })),
      };
      break;
    case "DROPDOWN":
      question.choiceQuestion = {
        type: "DROP_DOWN",
        options: (options || ["Option 1", "Option 2"]).map((o) => ({ value: o })),
      };
      break;
    case "SCALE":
      question.scaleQuestion = { low: 1, high: 5, lowLabel: "Poor", highLabel: "Excellent" };
      break;
  }

  try {
    const res = await forms.forms.batchUpdate({
      formId,
      requestBody: {
        requests: [
          {
            createItem: {
              item: {
                title,
                questionItem: { question },
              },
              location: { index: 0 },
            },
          },
        ],
      },
    });
    return { success: true, formId, action: "question_added", title, questionType, reply: res.data.replies };
  } catch (err: any) {
    console.error(`[Forms] addQuestion failed:`, err.message, err.response?.data);
    throw new Error(`Failed to add question "${title}": ${err.message}`);
  }
}

export async function getForm(userId: string, formId: string) {
  const forms = await getAuthenticatedForms(userId);
  const res = await forms.forms.get({ formId });
  return {
    formId: res.data.formId,
    title: res.data.info?.title,
    description: res.data.info?.description,
    url: res.data.responderUri,
    itemCount: res.data.items?.length || 0,
    items: (res.data.items || []).slice(0, 20).map((item) => ({
      title: item.title,
      questionType: item.questionItem?.question?.textQuestion
        ? "text"
        : item.questionItem?.question?.choiceQuestion
        ? "choice"
        : item.questionItem?.question?.scaleQuestion
        ? "scale"
        : "other",
    })),
  };
}

export async function getResponses(userId: string, formId: string) {
  const forms = await getAuthenticatedForms(userId);
  const res = await forms.forms.responses.list({ formId });
  const responses = (res.data.responses || []).slice(0, 50).map((r) => ({
    responseId: r.responseId,
    createTime: r.createTime,
    lastSubmittedTime: r.lastSubmittedTime,
    answers: Object.fromEntries(
      Object.entries(r.answers || {}).map(([qId, answer]) => [
        qId,
        answer.textAnswers?.answers?.map((a) => a.value).join(", ") || "N/A",
      ])
    ),
  }));
  return { totalResponses: res.data.responses?.length || 0, responses };
}

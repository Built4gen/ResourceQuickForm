exports.handler = async (event) => {
  const { payload } = JSON.parse(event.body);
  if (payload.form_name !== "leads") return { statusCode: 200 };

  const d = payload.data || {};
  const smsConsent = d.sms_consent === "yes";
  const submittedAt = payload.created_at || new Date().toISOString();

  const tags = ["Website Lead"];
  if (d.goal) tags.push(`Goal: ${d.goal}`);
  tags.push(smsConsent ? "SMS Consent" : "No SMS Consent");

  const consentRecord =
    `Call/email/text consent checkbox: ${smsConsent ? "YES" : "NO"}\n` +
    `Consent captured: ${submittedAt}\n` +
    `Form page: ${d.referrer || "website landing page"}\n` +
    `IP: ${d.ip || "n/a"}`;

  const body = {
    source: "built4gen.com",
    system: "Built4GenLandingPage",
    type: "General Inquiry",
    message:
      `Looking to: ${d.goal || "n/a"}\nTimeframe: ${d.timeframe || "n/a"}\n` +
      `Message: ${d.message || "(none)"}\n\n${consentRecord}`,
    person: {
      firstName: d.first_name,
      lastName: d.last_name,
      emails: d.email ? [{ value: d.email }] : [],
      phones: d.phone ? [{ value: d.phone, type: "mobile" }] : [],
      tags,
    },
  };

  const auth = Buffer.from(`${process.env.FUB_API_KEY}:`).toString("base64");
  const res = await fetch("https://api.followupboss.com/v1/events", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error("Follow Up Boss error", res.status, await res.text());
    return { statusCode: 502 };
  }
  return { statusCode: 200 };
};

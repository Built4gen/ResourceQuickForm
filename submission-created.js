// Runs automatically on Netlify every time a form submission is received.
// Forwards the lead to Follow Up Boss using the Events API.
// Requires the environment variable FUB_API_KEY to be set in Netlify.

exports.handler = async (event) => {
  const { payload } = JSON.parse(event.body);
  if (payload.form_name !== "leads") return { statusCode: 200 };

  const d = payload.data || {};
  const serviceSMS = d.sms_consent_service === "yes";
  const marketingSMS = d.sms_consent_marketing === "yes";
  const submittedAt = payload.created_at || new Date().toISOString();

  const tags = ["Website Lead"];
  if (d.goal) tags.push(`Goal: ${d.goal}`);
  tags.push(serviceSMS ? "SMS Consent - Inquiry" : "No SMS Consent - Inquiry");
  tags.push(marketingSMS ? "SMS Consent - Marketing" : "No SMS Consent - Marketing");

  const consentRecord =
    `SMS consent (inquiry texts): ${serviceSMS ? "YES" : "NO"}\n` +
    `SMS consent (marketing/automated texts): ${marketingSMS ? "YES" : "NO"}\n` +
    `Consent captured: ${submittedAt}\n` +
    `Form page: ${d.referrer || "website landing page"}\n` +
    `IP: ${d.ip || "n/a"}`;

  const person = {
    firstName: d.first_name,
    lastName: d.last_name,
    emails: d.email ? [{ value: d.email }] : [],
    phones: d.phone ? [{ value: d.phone, type: "mobile" }] : [],
    tags,
  };

  const body = {
    source: "built4gen.com",            // change if your site uses a different domain
    system: "Built4GenLandingPage",
    type: "General Inquiry",
    message:
      `Looking to: ${d.goal || "n/a"}\nTimeframe: ${d.timeframe || "n/a"}\n` +
      `Message: ${d.message || "(none)"}\n\n${consentRecord}`,
    person,
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

export async function sendSendgridEmail({
    apiKey,
    from,
    to,
    subject,
    html,
  }: {
    apiKey: string;
    from: string;
    to: string;
    subject: string;
    html: string;
  }) {
    const result = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: to }]
          }
        ],
        from: { email: from },
        subject,
        content: [
          {
            type: "text/html",
            value: html
          }
        ]
      })
    });
  
    return {
      ok: result.ok,
      status: result.status,
      body: await result.text(),
    };
  }
  